#!/usr/bin/env node
import tape from "tape"
import DoubleMap from "./_fixture_double.js"
import Fixture012 from "./_fixture_012.js"

tape( "map for-await loop", async function( t){
	t.plan( 4)
	let count= 0 // loop counter
	const
		input= Fixture012(),
		map= new DoubleMap({ input})
	for await( let n of map){
		t.equal( n, count* 2, `value=${count}`)
		++count
	}
	t.equal( count, 3, "loop count")
	t.end()
})
