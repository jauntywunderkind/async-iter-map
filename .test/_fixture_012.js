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

