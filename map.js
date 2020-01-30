#!/usr/bin/env node
import Defer from "p-defer"
import ShimToPolyfill from "shim-to-polyfill"
const AbortError= ShimToPolyfill( "AbortError", import("abort-controller"))

export const
	DropItem= Symbol.for( "async-iter-map:drop-item"),
	FlattenItem= Symbol.for( "async-iter-map:flatten-item"),
	symbol= {
		DropItem,
		FlattenItem
	}
export {
	symbol as Symbol
}

export function AsyncIterMap({ cleanup, closeInput, count, input, map, signal}= {}){
	Object.defineProperties( this, {
		abort: {
			value: this.abort.bind( this),
			writable: true
		},
		count: {
			value: (count!== undefined? count: this.count)|| 0,
			writable: true
		},
		...( cleanup=== false&& { cleanup: {
			value: false,
			writable: true
		}}),
		...( closeInput=== false&& { closeInput: {
			value: false,
			writable: true
		}}),
		...( !this.input&&{ input: {
			value: input,
			writable: true
		}}),
		...( !this.map&&{ map: {
			value: map,
			writable: true
		}}),
		_nexting: {
			value: false,
			writable: true
		},
		_queued: { // iterator for any pending, flattened results
			value: null,
			writable: true
		}
	})

	if( signal){
		signal.addEventListener( "abort", this.abort)
	}
	return this
}

AsyncIterMap.prototype._maps= [ "map"]

function notDrop( item){
	return item!== DropItem
}

// HAZARD: calling .next() while another .next() is running is very race-y
AsyncIterMap.prototype.next= async function( passed){
	// wait for whomever is running .next() to finish
	if( this._nexting){
		if( this._nexting=== true){
			this._nexting= Defer()
		}
		await this._nexting.promise
	}
	// early terminate
	if( this.done){
		return {
			done: true,
			value: undefined
		}
	}
	// process all flattened items first
	QUEUED: if( this._queued){
		const value= this._queued.shift()
		if( this._queued.lenght=== 0){
			this._queued= null
			break QUEUED
		}
		++this.count
		return {
			value,
			done: false
		}
	}

	// get next item
	this._nexting= true
	const next= await this.input.next()
	if( next.done){
		this._done()
		return {
			value: undefined,
			done: true
		}
	}

	let
		mapName,
		solo= next.value, // only a single known value
		many= solo&& solo[ FlattenItem]&& [ ...solo] // multiple values
	const mapValue= async v=> {
		if( v=== DropItem){
			return
		}
		let
			mapped= await this[ mapName]( v, this.count, passed, Symbol),
			gotMany= mapped&& mapped[ FlattenItem]
		if( !many){ // presently only a solo value
			if( gotMany){
				many= mapped
			}else{
				solo= mapped
			}
		}else{
			if( gotMany){
				many.push( ...mapped)
			}else{
				many.push( mapped)
			}
		}
	}
	// run each map as a pass through all of previous pass
	for( mapName of this._maps){
		if( !( this[ mapName])){
			continue
		}

		// run map
		if( !many){
			await mapValue( solo)
		}else{
			// take each element in many, & map it into new many
			const oldMany= many
			many= undefined
			solo= DropItem
			const allMapped= oldMany.map( mapValue)
			await Promise.all( allMapped)
		}

		// shrink
		if( many){
			many= many.filter( notDrop)
			// downgrade too
			if( many.length< 2){
				solo= many.length? many[ 0]: DropItem
				many= undefined
			}
		}

		// nothing left to yield try again
		if( !many&& solo=== DropItem){
			this._unnexting()
			return this.next()
		}
	}
	this._unnexting()

	// store & yield
	if( many){
		// TODO: switch back to iterator
		this._queued= !this._queued? many: [ ...this._queued, ...many]
		return this.next()
	}

	// return
	++this.count
	return {
		value: solo,
		done: false
	}
}
export {
	AsyncIterMap as default,
	AsyncIterMap as asyncIterMap,
	AsyncIterMap as map,
	AsyncIterMap as Map
}
Object.defineProperties( AsyncIterMap, {
	Symbol: {
		get: function(){
			return symbol
		}
	}
})
AsyncIterMap.prototype[ Symbol.asyncIterator]= function(){
	return this
}
AsyncIterMap.prototype.return= function( value){
	if( this.closeInput!== false&& this.input&& this.input.return){
		this.input.return( value)
	}
	this._done()
	return Promise.resolve({
		done: true,
		value
	})
}
AsyncIterMap.prototype.throw= function( err){
	if( this.closeInput!== false&& this.input&& this.input.throw){
		this.input.throw( err)
	}
	this._done()
	return Promise.reject( err)
}
AsyncIterMap.prototype.abort= function( err){
	if( !err){
		err= new AbortError()
	}else if( !(err.constructor.name=== "AbortError"|| err instanceof AbortError)){
		err= new AbortError( err)
	}
	return this.throw( err)
}
AsyncIterMap.prototype._done= function(){
	this.done= true
	this._unnexting()
	if( this.cleanup!== false){
		this.input= null
	}
}
AsyncIterMap.prototype._unnexting= function(){
	if( this._nexting&& this._nexting.resolve){
		this._nexting.resolve()
	}
	this._nexting= false
}

export async function main( ...opts){
	const
		gets= (await import("voodoo-opt/opt.js")).gets,
		ctx= await gets({
			args: undefined,
			lines: undefined
		}),
		// take the process's extended arguments & turn them into a mapper function, that has these variables
		map= new Function( "item", "count", "passed", "symbol", ctx.args[ "_"].join( " ")),
		// run stdin lines through map
		mapper= new AsyncIterMap({
			input: ctx.lines,
			map
		})
	// read out the mapped stream
	for await( const out of mapper){
		console.log( out)
	}
}
if( typeof process!== "undefined"&& `file://${ process.argv[ 1]}`== process.argv[ 1]){
	main()
}
