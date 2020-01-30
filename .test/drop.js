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

tape( "input of a single DropItem", async function( t){
	t.plan( 1)
	function map( n){
		t.fail( "should not map")
	}
	const input= (async function*(){
		yield DropItem
	})()
	const m= new Map({ input, map})

	for await( let item of m){
		t.fail( "should not map")
	}
	t.pass( "dropped")
	t.end()
})

tape( "map can drop", async function( t){
	t.plan( 2)
	let loops= 0 // loop counter
	function map( n){
		if( ++loops %2=== 0){
			return DropItem
		}
		return n
	}
	const input= (async function*(){
		yield 1
		yield 2
		yield 3
		yield 4
	})()
	const m= new Map({ input, map})

	let agg= 0
	for await( let item of m){
		agg+= item
	}
	t.equal( loops, 4, "loops=4")
	t.equal( agg, 4, "agg=4")
	t.end()
})
