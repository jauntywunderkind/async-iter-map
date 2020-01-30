#!/usr/bin/env node
import tape from "tape"
import Map, { Flatten} from "../map.js"

tape( "map can expand", async function( t){
	t.plan( 1)
	function map( n){
		return Flatten( function*(){
			yield n
			yield n* 2
		}())
	}
	const input= (async function*(){
		yield 2
		yield 3
	})()
	const m= new Map({ input, map})

	let agg= 0
	for await( let item of m){
		agg+= item
	}
	t.equal( agg, 2+4+3+6, "agg=15")
	t.end()
})

