#!/usr/bin/env node
import tape from "tape"
import Map from "../map.js"
import Fixture012 from "./_fixture_012.js"

tape( "map", async function( t){
	t.plan( 5)
	let agg= 0
	function mapper( n){
		agg+= n
		return n
	}
	const
		input= Fixture012(),
		map= new Map({ input, map: mapper}),
		v0= await map.next()
	t.equal( v0.value, 0, "value=0")
	const v1= await map.next()
	t.equal( v1.value, 1, "value=1")
	const v2= await map.next()
	t.equal( v2.value, 2, "value=2")
	const vDone= await map.next()
	t.equal( vDone.done, true, "done")
	t.equal( agg, 3, "agg=3")
})

tape( "map for-await loop", async function( t){
	t.plan( 5)
	let
		agg= 0, // aggregated
		count= 0 // loop counter
	function mapper( n){
		agg+= n
		return n
	}
	const
		input= Fixture012(),
		map= new Map({ input, map: mapper})
	for await( let n of map){
		t.equal( n, count, `value=${count}`)
		++count
	}
	t.equal( count, 3, "loop count")
	t.equal( agg, 3, "aggregator")
})
