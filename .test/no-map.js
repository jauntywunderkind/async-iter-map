#!/usr/bin/env node
import tape from "tape"

import Map from "../map.js"
import Fixture012 from "./_fixture_012.js"

tape( "no map", async function( t){
	t.plan( 5)
	const
		input= Fixture012(),
		map= new Map({ input})
	let
		agg= 0, // aggregated
		count= 0 // loop counter
	for await( let n of map){
		t.equal( n, count, `value=${count}`)
		agg+= n
		++count
	}
	t.equal( count, 3, "loop count")
	t.equal( agg, 3, "aggregator")
	t.end()
})
