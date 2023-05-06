'use client'

import {useRef, useState, useEffect, Fragment, useCallback} from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import * as Plot from '@observablehq/plot'
import * as d3 from 'd3'
import * as topojson from 'topojson'

/**
 * OLD MEN! WARNING! WARNING!
 */
const useAsync = (f, ...args) => {
	const [data, setData] = useState()
	useEffect(() => {
		f(...args).then(setData)
	}, [...args])
	return data
}

const toISO = s => new Date(s.replace(' ', 'T'))
const loadCsv = (path, f) => d3.csv(path, d3.autoType, f)
const processClient = row => ({
	...row,
	Intake_Completed_Date: toISO(row.Intake_Completed_Date),
	Intake_Submitted_Date: toISO(row.Intake_Submitted_Date),
	Secured_Employment_Date: toISO(row.Secured_Employment_Date),
	WES_Application_Submission_Date: toISO(row.WES_Application_Submission_Date),
})
const OPlot = props => {
	const {children: renderPlot, onAppend} = props
	const ref = useRef()
	useEffect(() => {
		if (renderPlot === undefined || !ref.current) return
		const plot = renderPlot()
		if (!plot) return
		ref.current.append(plot)
		onAppend?.()
		return () => plot.remove()
	}, [renderPlot])
	return (
		<div ref={ref}/>
	)
}

function Feature(city, {properties = {}, ...rest} = {}) {
	this.type = 'Feature'
	const {id, geometry} = city
	Object.assign(this, {
		id,
		geometry,
		properties: {...properties}
	})
}

const handleClick = e => {
	alert('swag turned on')
}
const groupToMap = f => xs => {
	return xs.reduce(
		(acc, d) => {
			const key = f(d)
			const ary = acc.get(key) ?? []
			ary.push(d)
			acc.set(key, ary)
			return acc
		},
		new Map()
	)
}
const Dialog = props => {
	return props.children
}
function Point(long, lat) {
	Object.assign(this, {type: 'Point', coordinates: [long, lat]})
}
const Swag = props => {
	const [city, setCity] = useState()
	const dialog = useRef()

	const land = useAsync(
		() => fetch('/countries-110m.json')
			.then(r => r.json())
			.then(world => topojson.feature(world, world.objects.land))
	)
	const citiesByCity = useAsync(
		() => loadCsv('/MAG_EXO.csv')
			.then(cities => cities.reduce((acc, city) => {
				acc.set(city.Name_en, {
					geometry: new Point(city.Longitude, city.Latitude)
					, id: city.PNuid_NLidu
				})
				return acc
			}, new Map()))
	)
	const originByOrigin = useAsync(
		() => loadCsv('/CountryLatLong.csv')
			.then(rows => rows.reduce((acc, {name, latitude, longitude}) => {
				acc.set(name, {
					geometry: new Point(longitude, latitude)
					, id: name
				})
				return acc
			}, new Map()))
	)
	console.log(originByOrigin)
	const {data, dataByCity, dataByOrigin} = useAsync(() => loadCsv('/Client.csv', processClient)
		.then(data => ({
			data,
			dataByCity: groupToMap(d => d.City)(data),
			dataByOrigin: groupToMap(d => d.Origin_Country)(data),
		}))
	) ?? {}

	useEffect(() => {
		if (!dialog.current) return
		const listener = () => setCity(undefined)
		dialog.current.addEventListener('close', listener)
		return () => dialog.current.removeEventListener(listener)
	}, [])

	const handlePathClick = e => {
		const cityName = e.target.querySelector('title').innerHTML.split('—')[0].trim()
		setCity(cityName)
		dialog.current.showModal()
	}

	const selectedData = dataByCity?.get(city) ?? {}
	console.log([...dataByOrigin?.keys() ?? []])
	return (
		<Fragment>
			<dialog ref={dialog}>
				{JSON.stringify(selectedData)}
			</dialog>
			<OPlot onAppend={() => {
				for (const title of document.querySelectorAll('path > title')) {
					const path = title.closest('path')
					path.addEventListener('click', handlePathClick)
				}
			}}>{
				() => {
					if (!land || !citiesByCity || !data) return
					const collectedIntoGeoJson = data.reduce((acc, {City}) => {
						const city = City === 'Other' ? 'Londonderry' : City
						const soFar = acc.get(city) ?? new Feature(citiesByCity.get(city), {
							properties: {nPeople: 1, name: City}
						})
						soFar.properties.nPeople += 1
						acc.set(City, soFar)
						return acc
					}, new Map())
					return Plot.plot({
						projection: 'equirectangular',
						style: 'overflow: visible;',
						marks: [
							Plot.geo(land, {fill: 'black', fillOpacity: 1}),
							Plot.sphere(),
							Plot.geo({
								type: 'FeatureCollection',
								features: [...collectedIntoGeoJson.values()],
								bbox: [-179.7446, -53.0559, -3, 179.8326, 67.563, 608.807],
							}, {
								r: d => d.properties.nPeople,
								title: d => `${d.properties.name} — ${d.properties.nPeople}`,
								id: d => d.id,
								fill: 'red',
								fillOpacity: 0.2,
								stroke: 'red',
							}),
							Plot.geo({
								type: 'FeatureCollection',
								features: [...originByOrigin.values()].map(
									o => new Feature(o)
								),
								bbox: [-179.7446, -53.0559, -3, 179.8326, 67.563, 608.807],
							}, {
								r: d => dataByOrigin.get(d.id)?.length ?? 1,
								title: d => d.id,
								fill: 'blue',
								fillOpacity: 0.2,
								stroke: 'blue',
							}),
						]
					})
				}
			}</OPlot>
		</Fragment>
	)
}

export default function Home() {
  return (
    <main style={{height: '100vh', width: '100vw'}}>
			<Swag>
			</Swag>
    </main>
  )
}
