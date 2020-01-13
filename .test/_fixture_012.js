#!/usr/bin/env node
export async function *Fixture012( ...n){
	n= n.length? n: [ 0, 1, 2]
	for( let i= 0; i< n.length; ++i){
		yield n[ i]
	}
}
export {
	Fixture012 as default,
	Fixture012 as fixture012
}

export async function main(){
	for await( let n of Fixture012()){
		console.log( n)
	}
}
if( typeof process!== "undefined"&& `file://${ process.argv[ 1]}`=== import.meta.url){
	main()
}
