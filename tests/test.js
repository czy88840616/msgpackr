import * as msgpackr from '../index.js'
import '../struct.js'
import chai from 'chai'
import inspector  from 'inspector';
//inspector.open(9229, null, true); debugger
import { readFileSync } from 'fs'
let allSampleData = [];
for (let i = 1; i < 6; i++) {
	allSampleData.push(JSON.parse(readFileSync(new URL(`./example${i > 1 ? i : ''}.json`, import.meta.url))));
}
allSampleData.push({
	name: 'some other types',
	date: new Date(),
	empty: '',
})
const sampleData = allSampleData[3];
function tryRequire(module) {
	try {
		return require(module)
	} catch(error) {
		return {}
	}
}

let seed = 0;
function random() {
	seed++;
	let a = seed * 15485863;
	return (a * a * a % 2038074743) / 2038074743;
}
//if (typeof chai === 'undefined') { chai = require('chai') }
var assert = chai.assert
//if (typeof msgpackr === 'undefined') { msgpackr = require('..') }
var Packr = msgpackr.Packr
var Unpackr = msgpackr.Unpackr
var unpack = msgpackr.unpack
var unpackMultiple = msgpackr.unpackMultiple
var roundFloat32 = msgpackr.roundFloat32
var pack = msgpackr.pack
var DECIMAL_FIT = msgpackr.FLOAT32_OPTIONS.DECIMAL_FIT

var addExtension = msgpackr.addExtension
var zlib = tryRequire('zlib')
var deflateSync = zlib.deflateSync
var inflateSync = zlib.inflateSync
var deflateSync = zlib.brotliCompressSync
var inflateSync = zlib.brotliDecompressSync
var constants = zlib.constants
try {
//	var { decode, encode } = require('msgpack-lite')
} catch (error) {}

var ITERATIONS = 4000

suite('msgpackr basic tests', function(){
	test('pack/unpack data', function(){
		var data = {
			data: [
				{ a: 1, name: 'one', type: 'odd', isOdd: true },
				{ a: 2, name: 'two', type: 'even'},
				{ a: 3, name: 'three', type: 'odd', isOdd: true },
				{ a: 4, name: 'four', type: 'even'},
				{ a: 5, name: 'five', type: 'odd', isOdd: true },
				{ a: 6, name: 'six', type: 'even', isOdd: null }
			],
			description: 'some names',
			types: ['odd', 'even'],
			convertEnumToNum: [
				{ prop: 'test' },
				{ prop: 'test' },
				{ prop: 'test' },
				{ prop: 1 },
				{ prop: 2 },
				{ prop: [undefined] },
				{ prop: null }
			]
		}
		let structures = []
		let packr = new Packr({ structures })
		var serialized = packr.pack(data)
		serialized = packr.pack(data)
		serialized = packr.pack(data)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data)
	})

	test('mixed structures', function(){
		let data1 = { a: 1, b: 2, c: 3 }
		let data2 = { a: 1, b: 2, d: 4 }
		let data3 = { a: 1, b: 2, e: 5 }
		let structures = []
		let packr = new Packr({ structures })
		var serialized = packr.pack(data1)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data1)
		var serialized = packr.pack(data2)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data2)
		var serialized = packr.pack(data3)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data3)
	})

	test('mixed array', function(){
		var data = [
			'one',
			'two',
			'one',
			10,
			11,
			null,
			true,
			'three',
			'three',
			'one', [
				3, -5, -50, -400,1.3, -5.3, true
			]
		]
		let structures = []
		let packr = new Packr({ structures })
		var serialized = packr.pack(data)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data)
	})

	test('255 chars', function() {
		const data = 'RRZG9A6I7xupPeOZhxcOcioFsuhszGOdyDUcbRf4Zef2kdPIfC9RaLO4jTM5JhuZvTsF09fbRHMGtqk7YAgu3vespeTe9l61ziZ6VrMnYu2CamK96wCkmz0VUXyqaiUoTPgzk414LS9yYrd5uh7w18ksJF5SlC2e91rukWvNqAZJjYN3jpkqHNOFchCwFrhbxq2Lrv1kSJPYCx9blRg2hGmYqTbElLTZHv20iNqwZeQbRMgSBPT6vnbCBPnOh1W'
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.equal(deserialized, data)
	})
	test('pack/unpack varying data with random access structures', function() {
		let structures = []
		let packr = new Packr({ structures, useRecords: true, randomAccessStructure: true, freezeData: true, saveStructures(structures) {
			}, getStructures() {
				console.log('getStructures');
			} })
		for (let i = 0; i < 20; i++) {
			let data = {};
			let props = ['foo', 'bar', 'a', 'b', 'c','name', 'age', 'd'];
			function makeString() {
				let str = '';
				while (random() < 0.9) {
					str += random() < 0.8 ? 'hello world' : String.fromCharCode(300);
				}
				return str;
			}
			for (let i = 0; i < random() * 20; i++) {
				data[props[Math.floor(random() * 8)]] =
					random() < 0.3 ? Math.floor(random() * 400) / 2 :
						random() < 0.3 ? makeString() : random() < 0.3 ? true : random() < 0.3 ? sampleData : null;
			}
			var serialized = packr.pack(data)
			var deserialized = packr.unpack(serialized);
			for (let key in deserialized) {
				let a = deserialized[key];
			}
			assert.deepEqual(deserialized, data)
		}
	})

	for (let sampleData of allSampleData) {
		let snippet = JSON.stringify(sampleData).slice(0, 20) + '...';
		test('pack/unpack sample data ' + snippet, function(){
			var data = sampleData
			let structures = []
			var serialized = pack(data)
			var deserialized = unpack(serialized)
			assert.deepEqual(deserialized, data)
			var serialized = pack(data)
			var deserialized = unpack(serialized)
			assert.deepEqual(deserialized, data)
		})
		test('pack/unpack sample data with random access structures ' + snippet, function() {
			var data = sampleData
			let structures = []
			let packr = new Packr({ structures, useRecords: true, randomAccessStructure: true, freezeData: true, saveStructures(structures) {
			}, getStructures() {
				console.log('getStructures');
			} })
			for (let i = 0; i < 20; i++) {
				var serialized = packr.pack(data)
				var deserialized = packr.unpack(serialized, { lazy: true });
				var copied = {}
				for (let key in deserialized) {
					copied[key] = deserialized[key];
				}
				assert.deepEqual(copied, data)
			}
		})
		test('pack/unpack sample data with bundled strings ' + snippet, function(){
			var data = sampleData
			let packr = new Packr({ /*structures,*/ useRecords: false, bundleStrings: true })
			var serialized = packr.pack(data)
			var deserialized = packr.unpack(serialized)
			assert.deepEqual(deserialized, data)
		})
	}

	test('pack/unpack empty data with bundled strings', function(){
		var data = {}
		let packr = new Packr({ bundleStrings: true })
		var serialized = packr.pack(data)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data)
	})
	test('pack/unpack sequential data', function(){
		var data = { foo:1, bar: 2 }
		let packr = new Packr({ sequential: true })
		let unpackr = new Unpackr({ sequential: true })
		var serialized = packr.pack(data)
		var deserialized = unpackr.unpack(serialized)
		assert.deepEqual(deserialized, data)
		var serialized = packr.pack(data)
		var deserialized = unpackr.unpack(serialized)
		assert.deepEqual(deserialized, data)
	})
	if (typeof Buffer != 'undefined')
	test('replace data', function(){
		var data1 = {
			data: [
				{ a: 1, name: 'one', type: 'odd', isOdd: true, a: '13 characters' },
				{ a: 2, name: 'two', type: 'even', a: '11 characte' },
				{ a: 3, name: 'three', type: 'odd', isOdd: true, a: '12 character' },
				{ a: 4, name: 'four', type: 'even', a: '9 charact'},
				{ a: 5, name: 'five', type: 'odd', isOdd: true, a: '14 characters!' },
				{ a: 6, name: 'six', type: 'even', isOdd: null }
			],
		}
		var data2 = {
			data: [
				{ foo: 7, name: 'one', type: 'odd', isOdd: true },
				{ foo: 8, name: 'two', type: 'even'},
				{ foo: 9, name: 'three', type: 'odd', isOdd: true },
				{ foo: 10, name: 'four', type: 'even'},
				{ foo: 11, name: 'five', type: 'odd', isOdd: true },
				{ foo: 12, name: 'six', type: 'even', isOdd: null }
			],
		}
		var serialized1 = pack(data1)
		var serialized2 = pack(data2)
		var b = Buffer.alloc(8000)
		serialized1.copy(b)
		var deserialized1 = unpack(b, serialized1.length)
		serialized2.copy(b)
		var deserialized2 = unpack(b, serialized2.length)
		assert.deepEqual(deserialized1, data1)
		assert.deepEqual(deserialized2, data2)
	})

	test('compact 123', function() {
		assert.equal(pack(123).length, 1)
	})

	test('extended class pack/unpack', function(){
		function Extended() {

		}
		Extended.prototype.getDouble = function() {
			return this.value * 2
		}
		var instance = new Extended()
		instance.value = 4
		instance.string = 'decode this: ᾜ'
		var data = {
			prop1: 'has multi-byte: ᾜ',
			extendedInstance: instance,
			prop2: 'more string',
			num: 3,
		}
		let packr = new Packr()
		addExtension({
			Class: Extended,
			type: 11,
			unpack: function(buffer) {
				let e = new Extended()
				let data = packr.unpack(buffer)
				e.value = data[0]
				e.string = data[1]
				return e
			},
			pack: function(instance) {
				return packr.pack([instance.value, instance.string])
			}
		})
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(data, deserialized)
		assert.equal(deserialized.extendedInstance.getDouble(), 8)
	})
	test('extended class pack/unpack custom size', function(){
		function TestClass() {

		}
		addExtension({
			Class: TestClass,
			type: 0x01,
			pack() {
				return typeof Buffer != 'undefined' ? Buffer.alloc(256) : new Uint8Array(256)
			},
			unpack(data) {
				return data.length
			}
		});
		let result = unpack(pack(new TestClass()));
		assert.equal(result, 256)
	})

	test('extended class read/write', function(){
		function Extended() {

		}
		Extended.prototype.getDouble = function() {
			return this.value * 2
		}
		var instance = new Extended()
		instance.value = 4
		instance.string = 'decode this: ᾜ'
		var data = {
			prop1: 'has multi-byte: ᾜ',
			extendedInstance: instance,
			prop2: 'more string',
			num: 3,
		}
		let packr = new Packr()
		addExtension({
			Class: Extended,
			type: 12,
			read: function(data) {
				let e = new Extended()
				e.value = data[0]
				e.string = data[1]
				return e
			},
			write: function(instance) {
				return [instance.value, instance.string]
			}
		})
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(data, deserialized)
		assert.equal(deserialized.extendedInstance.getDouble(), 8)
	})
	test('proto handling', function() {
		var objectWithProto = JSON.parse('{"__proto__":{"foo":3}}');
		var decoded = unpack(pack(objectWithProto));
		assert(!decoded.foo);
		var objectsWithProto = [objectWithProto, objectWithProto, objectWithProto, objectWithProto, objectWithProto, objectWithProto];
		let packr = new Packr();
		var decoded = packr.unpack(packr.pack(objectsWithProto));
		for (let object of decoded) {
			assert(!decoded.foo);
		}
	});

	test.skip('text decoder', function() {
			let td = new TextDecoder('ISO-8859-15')
			let b = Buffer.alloc(3)
			let total = 0
			for (var i = 0; i < 256; i++) {
				b[0] = i
				b[1] = 0
				b[2] = 0
				let s = td.decode(b)
				if (!require('msgpackr-extract').isOneByte(s)) {
					console.log(i.toString(16), s.length)
					total++
				}
			}
	})

	test('structured cloning: self reference', function() {
		let object = {
			test: 'string',
			children: [
				{ name: 'child' }
			]
		}
		object.self = object
		object.children[1] = object
		object.children[2] = object.children[0]
		object.childrenAgain = object.children
		let packr = new Packr({
			moreTypes: true,
			structuredClone: true,
		})
		var serialized = packr.pack(object)
		var deserialized = packr.unpack(serialized)
		assert.equal(deserialized.self, deserialized)
		assert.equal(deserialized.children[0].name, 'child')
		assert.equal(deserialized.children[1], deserialized)
		assert.equal(deserialized.children[0], deserialized.children[2])
		assert.equal(deserialized.children, deserialized.childrenAgain)
	})

	test('structured cloning: types', function() {
		let b = typeof Buffer != 'undefined' ? Buffer.alloc(20) : new Uint8Array(20)
		let fa = new Float32Array(b.buffer, 8, 2)
		fa[0] = 2.25
		fa[1] = 6
		let object = {
			error: new Error('test'),
			set: new Set(['a', 'b']),
			regexp: /test/gi,
			float32Array: fa,
			uint16Array: new Uint16Array([3,4])
		}
		let packr = new Packr({
			moreTypes: true,
			structuredClone: true,
		})
		var serialized = packr.pack(object)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(Array.from(deserialized.set), Array.from(object.set))
		assert.equal(deserialized.error.message, object.error.message)
		assert.equal(deserialized.regexp.test('TEST'), true)
		assert.equal(deserialized.float32Array.constructor.name, 'Float32Array')
		assert.equal(deserialized.float32Array[0], 2.25)
		assert.equal(deserialized.float32Array[1], 6)
		assert.equal(deserialized.uint16Array.constructor.name, 'Uint16Array')
		assert.equal(deserialized.uint16Array[0], 3)
		assert.equal(deserialized.uint16Array[1], 4)
	})

	test('object without prototype', function(){
		var data = Object.create(null)
		data.test = 3
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})

	test('separate instances', function() {
		const packr = new Packr({
			structures: [['m', 'e'], ['action', 'share']]
		});
		const packr2 = new Packr({
			structures: [['m', 'e'], ['action', 'share']]
		});
		let packed = packr.pack([{m: 1, e: 2}, {action: 3, share: 4}]);
		// also tried directly decoding this without the first Packr instance packed = new Uint8Array([0x92, 0x40, 0x01, 0x02, 0x41, 0x03, 0x04]);
		console.log(packr2.unpack(packed));
	})

	test('many shared structures', function() {
		let data = []
		for (let i = 0; i < 200; i++) {
			data.push({['a' + i]: i})
		}
		let structures = []
		let savedStructures
		let packr = new Packr({
			structures,
			saveStructures(structures) {
				savedStructures = structures
			}
		})
		var serializedWith32 = packr.pack(data)
		assert.equal(savedStructures.length, 32)
		var deserialized = packr.unpack(serializedWith32)
		assert.deepEqual(deserialized, data)
		structures = structures.slice(0, 32)
		packr = new Packr({
			structures,
			maxSharedStructures: 100,
			saveStructures(structures) {
				savedStructures = structures
			}
		})
		deserialized = packr.unpack(serializedWith32)
		assert.deepEqual(deserialized, data)
		structures = structures.slice(0, 32)
		packr = new Packr({
			structures,
			maxSharedStructures: 100,
			saveStructures(structures) {
				savedStructures = structures
			}
		})
		let serialized = packr.pack(data)
		assert.equal(savedStructures.length, 100)
		deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data)

		deserialized = packr.unpack(serializedWith32)
		assert.deepEqual(deserialized, data)
		assert.equal(savedStructures.length, 100)

		deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data)
		assert.equal(packr.structures.sharedLength, 100)
	})
	test('more shared structures', function() {
		const structures = []
		for (let i = 0; i < 40; i++) {
			structures.push(['a' + i])
		}
		const structures2 = [...structures]
		const packr = new Packr({
			getStructures() {
				return structures
			},
			saveStructures(structures) {		  
			},
			maxSharedStructures: 100
		})
		const packr2 = new Packr({
			getStructures() {
				return structures2
			},
			saveStructures(structures) {		  
			},
			maxSharedStructures: 100
		})
		const inputData = {a35: 35}
		const buffer = packr.pack(inputData)
		const outputData = packr2.decode(buffer)
		assert.deepEqual(inputData, outputData)
	})

	test('big buffer', function() {
		var size = 100000000
		var data = new Uint8Array(size).fill(1)
		var packed = pack(data)
		var unpacked = unpack(packed)
		assert.equal(unpacked.length, size)
	})

	test('random strings', function(){
		var data = []
		for (var i = 0; i < 2000; i++) {
			var str = 'test'
			while (Math.random() < 0.7 && str.length < 0x100000) {
				str = str + String.fromCharCode(90/(Math.random() + 0.01)) + str
			}
			data.push(str)
		}
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})

	test('map/date', function(){
		var map = new Map()
		map.set(4, 'four')
		map.set('three', 3)


		var data = {
			map: map,
			date: new Date(1532219539733),
			farFutureDate: new Date(3532219539133),
			fartherFutureDate: new Date('2106-08-05T18:48:20.323Z'),
			ancient: new Date(-3532219539133),
			invalidDate: new Date('invalid')
		}
		let packr = new Packr()
		var serialized = packr.pack(data)
		var deserialized = packr.unpack(serialized)
		assert.equal(deserialized.map.get(4), 'four')
		assert.equal(deserialized.map.get('three'), 3)
		assert.equal(deserialized.date.getTime(), 1532219539733)
		assert.equal(deserialized.farFutureDate.getTime(), 3532219539133)
		assert.equal(deserialized.fartherFutureDate.toISOString(), '2106-08-05T18:48:20.323Z')
		assert.equal(deserialized.ancient.getTime(), -3532219539133)
		assert.equal(deserialized.invalidDate.toString(), 'Invalid Date')
	})
	test('map/date with options', function(){
		var map = new Map()
		map.set(4, 'four')
		map.set('three', 3)


		var data = {
			map: map,
			date: new Date(1532219539011),
			invalidDate: new Date('invalid')
		}
		let packr = new Packr({
			mapsAsObjects: true,
			useTimestamp32: true,
			onInvalidDate: () => 'Custom invalid date'
		})
		var serialized = packr.pack(data)
		var deserialized = packr.unpack(serialized)
		assert.equal(deserialized.map[4], 'four')
		assert.equal(deserialized.map.three, 3)
		assert.equal(deserialized.date.getTime(), 1532219539000)
		assert.equal(deserialized.invalidDate, 'Custom invalid date')
	})
	test('key caching', function() {
		var data = {
			foo: 2,
			bar: 'test',
			four: 4,
			seven: 7,
			foz: 3,
		}
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
		// do multiple times to test caching
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})
	test('strings', function() {
		var data = ['']
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
		// do multiple times
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
		data = 'decode this: ᾜ'
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
		data = 'decode this that is longer but without any non-latin characters'
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})
	test('decimal float32', function() {
		var data = {
			a: 2.526,
			b: 0.0035235,
			c: 0.00000000000352501,
			d: 3252.77,
		}
		let packr = new Packr({
			useFloat32: DECIMAL_FIT
		})
		var serialized = packr.pack(data)
		assert.equal(serialized.length, 32)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized, data)
	})
	test('bigint to float', function() {
		var data = {
			a: 325283295382932843n
		}
		let packr = new Packr({
			int64AsNumber: true
		})
		var serialized = packr.pack(data)
		var deserialized = packr.unpack(serialized)
		assert.deepEqual(deserialized.a, 325283295382932843)
	})
	test('numbers', function(){
		var data = {
			bigEncodable: 48978578104322,
			dateEpoch: 1530886513200,
			realBig: 3432235352353255323,
			decimal: 32.55234,
			negative: -34.11,
			exponential: 0.234e123,
			tiny: 3.233e-120,
			zero: 0,
			//negativeZero: -0,
			Infinity: Infinity
		}
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})
	test('bigint', function(){
		var data = {
			bigintSmall: 352n,
			bigintSmallNegative: -333335252n,
			bigintBig: 2n**64n - 1n, // biggest possible
			bigintBigNegative: -(2n**63n), // largest negative
			mixedWithNormal: 44,
		}
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
		var tooBigInt = {
			tooBig: 2n**66n
		}
		assert.throws(function(){ serialized = pack(tooBigInt) })
		let packr = new Packr({
			largeBigIntToFloat: true
		})
		serialized = packr.pack(tooBigInt)
		deserialized = unpack(serialized)
		assert.isTrue(deserialized.tooBig > 2n**65n)
	})

	test('roundFloat32', function() {
		assert.equal(roundFloat32(0.00333000003), 0.00333)
		assert.equal(roundFloat32(43.29999999993), 43.3)
	})

	test('buffers', function(){
		var data = {
			buffer1: new Uint8Array([2,3,4]),
			buffer2: new Uint8Array(pack(sampleData))
		}
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})

	test('notepack test', function() {
		const data = {
		  foo: 1,
		  bar: [1, 2, 3, 4, 'abc', 'def'],
		  foobar: {
		    foo: true,
		    bar: -2147483649,
		    foobar: {
		      foo: new Uint8Array([1, 2, 3, 4, 5]),
		      bar: 1.5,
		      foobar: [true, false, 'abcdefghijkmonpqrstuvwxyz']
		    }
		  }
		};
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		var deserialized = unpack(serialized)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})

	test('utf16 causing expansion', function() {
		this.timeout(10000)
		let data = {fixstr: 'ᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝ', str8:'ᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝᾐᾑᾒᾓᾔᾕᾖᾗᾘᾙᾚᾛᾜᾝ'}
		var serialized = pack(data)
		var deserialized = unpack(serialized)
		assert.deepEqual(deserialized, data)
	})
	test('unpackMultiple', () => {
		let values = unpackMultiple(new Uint8Array([1, 2, 3, 4]))
		assert.deepEqual(values, [1, 2, 3, 4])
		values = []
		unpackMultiple(new Uint8Array([1, 2, 3, 4]), value => values.push(value))
		assert.deepEqual(values, [1, 2, 3, 4])
	})

})
suite('msgpackr performance tests', function(){
	test('performance JSON.parse', function() {
		var data = sampleData
		this.timeout(10000)
		let structures = []
		var serialized = JSON.stringify(data)
		console.log('JSON size', serialized.length)
		for (var i = 0; i < ITERATIONS; i++) {
			var deserialized = JSON.parse(serialized)
		}
	})
	test('performance JSON.stringify', function() {
		var data = sampleData
		this.timeout(10000)
		for (var i = 0; i < ITERATIONS; i++) {
			var serialized = JSON.stringify(data)
		}
	})
	test('performance unpack', function() {
		var data = sampleData
		this.timeout(10000)
		let structures = []
		var serialized = pack(data)
		console.log('MessagePack size', serialized.length)
		let packr = new Packr({ structures, bundleStrings: false })
		var serialized = packr.pack(data)
		console.log('msgpackr w/ record ext size', serialized.length)
		for (var i = 0; i < ITERATIONS; i++) {
			var deserialized = packr.unpack(serialized)
		}
	})
	test('performance pack', function() {
		var data = sampleData
		this.timeout(10000)
		let structures = []
		let packr = new Packr({ structures, bundleStrings: false })
		let buffer = typeof Buffer != 'undefined' ? Buffer.alloc(0x10000) : new Uint8Array(0x10000)

		for (var i = 0; i < ITERATIONS; i++) {
			//serialized = pack(data, { shared: sharedStructure })
			packr.useBuffer(buffer)
			var serialized = packr.pack(data)
			//var serializedGzip = deflateSync(serialized)
		}
		//console.log('serialized', serialized.length, global.propertyComparisons)
	})
})
