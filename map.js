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
	// terminate
	if( this.done){
		return {
			done: true,
			value: undefined
		}
	}
	// get next item
	if( this._queued){
		const value= await this._queued.next()
		if( value.done){
			// re-attempt
			return this.next()
		}
		// success, got item
		++this.count
		return {
			value: value.value,
			done: false
		}
	}

	// get next item
	this._nexting= true
	const next= await this.input.next()
	if( next.done){
		this._unnexting()
		this._done()
		return {
			value: undefined,
			done: true
		}
	}

	// create iterator for results
	this._queued= this._unpack( next.value, passed)
	this._unnexting()
	return this.next()
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
AsyncIterMap.prototype._unpack= async function*( value, passed, depth= 0){
	const
		map= this._maps[ depth],
		mapped= await this[ map]( value, this.count, passed, symbol)
	if( mapped=== DropItem){
		return
	}
	const
		startDepth= depth++,
		last= depth>= this._maps.length
	if( mapped&& mapped[ FlattenItem]){
		for await( let item of mapped){
			if( item=== DropItem){
			}else if( last){
				yield item
			}else{
				yield *this._unpack( item, passed, depth)
			}
		}
	}else{
		if( last){
			yield mapped
		}else{
			yield *this._unpack( mapped, passed, depth)
		}
	}

	// clean ourselves up
	this._queued= null
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
