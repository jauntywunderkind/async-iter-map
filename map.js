#!/usr/bin/env node
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

AsyncIterMap.prototype.next= async function( passed){
	// process all flattened items first
	QUEUED: if( this._queued){
		const value= await this._queued.next()
		if( value.done){
			this._queued= null
			break QUEUED
		}
		return {
			value,
			done: false
		}
	}

	// get next item
	// TODO: some of me wants to make input, if swapped, to hot-update this next
	const next= await this.input.next()
	if( next.done){
		// no more input data
		this._done()
		return {
			value: undefined,
			done: true
		}
	}

	// run maps
	let value= next.value
	for( let map of this._maps){
		if( !( this[ map])){
			continue
		}

		value= this[ map]( value, this.count, passed, Symbol)
		// HAZARD: if someone calls .next() on us again, that .next() will likely resolve before this one if we drop
		if( value=== DropItem){
			// typically would await to give you your useful stack trace but yo maybe some day: tail-recursive
			return this.next()
		}
	}

	// flatten
	if( value&& value[ FlattenItem]){
		let
			iter,
			firstVal
		if( map.value[ Symbol.asyncIterator]){
			iter= map.value[ Symbol.asyncIterator]()
			firstVal= await iter.next()
		}else if( map.value[ Symbol.iterator]){
			iter= map.value[ Symbol.iterator]()
			firstVal= iter.next()
		}
		if( !iter){
			throw new Error( "map was told to flatten a value but not iterable")
		}
		this._queued= iter
		++this.count
		return {
			value: firstVal,
			done: false
		}
	}

	++this.count
	return {
		value,
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
	if( this.cleanup!== false){
		this.input= null
	}
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
