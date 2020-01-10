#!/usr/bin/env
import shimToPolyfill from "shim-to-polyfill"
const AbortError= ShimToPolyfill( "AbortError", "abort-controller/dist/abort-controller.mjs")

export const
	DropItem= Symbol.for( "async-iter-map:drop-item"),
	FlattenItem= Symbol.for( "async-iter-map:flatten-item")
	Item= {
		Drop: DropITem,
		Flatten: FlattenItem
	}

export function AsyncIterMap( input, map, opts){
	this.abort= this.abort.bind( this)
	if( opts&& opts.signal){
		opts.signal.addEventListener( "abort", this.abort)
	}

	Object.defineProperties( this, {
		_input: {
			value: _input
		},
		_map: {
			value: map
		},
		_queued: { // iterator for any pending, flattened results
			value: null
		}
	})
}

AsyncIterMap.prototype.next= async function(){
	// process all flattened items first
	QUEUED: if( this._queued){
		const value= await this._queued.next()
		if( value.done){
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
		this.done= true
		return {
			value: undefined,
			done: true
		}
	}

	// map data
	const mapped= this._map( next.value)

	// drop?
	// TODO: yo i heard you don't like recursive calls in non-tail-recursive langs but ohwell
	if( mapped=== DropItem){
		// typically would await to give you your useful stack trace but yo maybe some day: tail-recursive
		return this.next()
	}

	// flatten
	if( mapped.value&& mapped.value[ FlattenItem]){
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
		return {
			value: firstVal,
			done: false
		}
	}

	return {
		value: mapped.value,
		done: false
	}
	
}
AsyncIterMap.prototype.return= function(){
	this.done= true
}
AsyncIterMap.prototype.throw= function(){
	this.done= true
}
AsyncIterMap.prototype.abort= async function( err){
	if( err&& (err.constructor.name=== "AbortError"|| err instanceof AbortError))
	this.throw( new Abort
}

export async function main( ...opts){
	const vo= await import( "voodoo-opt")
	
}
