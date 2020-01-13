#!/usr/bin/env node
import ShimToPolyfill from "shim-to-polyfill"
const AbortError= ShimToPolyfill( "AbortError", import("abort-controller"))

export const
	DropItem= Symbol.for( "async-iter-map:drop-item"),
	FlattenItem= Symbol.for( "async-iter-map:flatten-item"),
	symbol= {
		Drop: DropItem,
		Flatten: FlattenItem
	}
export {
	symbol as Symbol
}

export function AsyncIterMap( input, map, opts){
	if( opts&& opts.signal){
		opts.signal.addEventListener( "abort", this.abort)
	}

	Object.defineProperties( this, {
		abort: {
			value: this.abort.bind( this),
			writable: true
		},
		count: {
			value: 0,
			writable: true
		},
		_input: {
			value: input,
			writable: true
		},
		_map: {
			value: map,
			writable: true
		},
		_queued: { // iterator for any pending, flattened results
			value: null,
			writable: true
		}
	})
}

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
	const next= await this._input.next()
	if( next.done){
		// no more input data
		this._done()
		return {
			value: undefined,
			done: true
		}
	}

	// map data
	const mapped= this._map( next.value, this.count, passed, Symbol)

	// drop?
	// TODO: yo i heard you don't like recursive calls in non-tail-recursive langs but ohwell
	if( mapped=== DropItem){
		// typically would await to give you your useful stack trace but yo maybe some day: tail-recursive
		return this.next()
	}

	// flatten
	if( mapped&& mapped[ FlattenItem]){
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
		value: mapped,
		done: false
	}
	
}
export {
	AsyncIterMap as default,
	AsyncIterMap as asyncIterMap,
	AsyncIterMap as map,
	AsyncIterMap as Map
}
AsyncIterMap.prototype[ Symbol.asyncIterator]= function(){
	return this
}
AsyncIterMap.prototype.return= function( value){
	this._done()
	return Promise.resolve({
		done: true,
		value
	})
}
AsyncIterMap.prototype.throw= function( err){
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
		this._input= null
	}
}

export async function main( ...opts){
	const
		gets= (await import("voodoo-opt/opt.js")).gets,
		ctx= await gets({
			args: undefined,
			lines: undefined
		}),
		fn= new Function( "item", "count", "passed", "symbol", ctx.args[ "_"].join( " ")),
		mapper= new AsyncIterMap( ctx.lines, fn, opts&& opts[ 0])
	for await( const out of mapper){
		console.log( out)
	}
}
if( typeof process!== "undefined"&& `file://${ process.argv[ 1]}`== process.argv[ 1]){
	main()
}
