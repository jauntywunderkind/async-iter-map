#!/usr/bin/env node
import tape from "tape"
import Map, { DropItem} from "../map.js"

tape( "input can have some DropItem", async function( t){
	t.plan( 2)
	let loops= 0 // loop counter
	function map( n){
		loops++
		return n* 2
	}
	const input= (async function*(){
		yield 1
		yield DropItem
		yield 2
		yield DropItem
	})()
	const m= new Map({ input, map})

	let agg= 0
	for await( let item of m){
		agg+= item
	}
	t.equal( loops, 2, "loops=2")
	t.equal( agg, 6, "agg=6")
	t.end()
})

tape( "input of a single DropItem", function( t){
	t.end()
})


tape( "map can drop", function( t){
	t.end()
})


