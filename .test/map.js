import tape from "tape"
import Map from "../map.js"
import Fixture012 from "./_fixture_012.js"

tape( "map", async function( t){
	t.plan( 5)
	let agg= 0
	const
		map= new Map( Fixture012(), function( n){
			agg+= n
			return n
		}),
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
	let agg= 0
	const map= new Map( Fixture012(), function( n){
		agg+= n
		return n
	})
	let cur= 0
	for await( let n of map){
		t.equal( n, cur, `value=${cur}`)
		++cur
	}
	t.equal( cur, 3, "currrent cursor")
	t.equal( agg, 3, "aggregator")
})
