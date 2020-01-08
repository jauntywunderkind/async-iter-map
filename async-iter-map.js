#!/usr/bin/env
import shimToPolyfill from "shim-to-polyfill"
const AbortError= ShimToPolyfill( "AbortError", "abort-controller/dist/abort-controller.mjs")

export const DropItem= Symbol.for( "async-iter-map:drop-item")

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
		}
	})
}

AsyncIterMap.prototype.next= async function(){
	
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
