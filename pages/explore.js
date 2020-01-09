import React, {useState, useEffect} from 'react'
import PropTypes from 'prop-types'
import Router from 'next/router'
import computeBbox from '@turf/bbox'

import Page from '../layouts/main'

import {contoursToGeoJson} from '../lib/geojson'
import {getDepartements, getDepartementCommunes} from '../lib/api-explore'

import Mapbox from '../components/mapbox'
import BANMap from '../components/explorer/ban-map'
import Header from '../components/explorer/header'
import {COLORS} from '../components/explorer/ban-map/hooks/layers'

const title = 'Consulter'
const description = 'Consulter les adresses'

function getCommuneColor(commune) {
  const {adressesCount, population, adressesCountTarget} = commune

  if (population === 0) {
    return COLORS.purple
  }

  if (adressesCount === 0) {
    return COLORS.red
  }

  if (adressesCount >= adressesCountTarget * 0.7 && adressesCount <= adressesCountTarget * 1.3) {
    return COLORS.green
  }

  if (adressesCount >= adressesCountTarget * 0.5 && adressesCount <= adressesCountTarget * 1.5) {
    return COLORS.yellow
  }

  return COLORS.red
}

function generateDepartementId(code) {
  let id = code

  // Corse
  if (code === '2A') {
    id = 200
  } else if (code === '2B') {
    id = 201
  } else {
    id = code.replace(/[AB]/, 0)
  }

  return id
}

function departementContour(departement) {
  const {contour, codeDepartement, ...otherProps} = departement

  return {
    id: generateDepartementId(codeDepartement),
    type: 'Feature',
    geometry: contour,
    properties: {
      codeDepartement,
      ...otherProps
    }
  }
}

function communeContour(commune) {
  const {contour, codeCommune, ...otherProps} = commune

  return {
    id: codeCommune,
    type: 'Feature',
    geometry: contour,
    properties: {
      codeCommune,
      ...otherProps
    }
  }
}

export function contoursDepartementsToGeoJson(departements) {
  const departementsWithCtr = departements.filter(dep => dep.contour)

  return {
    type: 'FeatureCollection',
    features: departementsWithCtr.map(dep => departementContour(dep))
  }
}

const Explore = ({departements}) => {
  const [communes, setCommunes] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bbox, setBbox] = useState(null)
  const [error, setError] = useState(null)

  const loadDepartement = async codeDepartement => {
    setIsLoading(true)
    setError(null)

    try {
      const departement = await getDepartementCommunes(codeDepartement)
      departement.communes.forEach(c => {
        c.color = getCommuneColor(c)
      })
      const geojson = contoursToGeoJson(departement.communes, communeContour)
      setCommunes(geojson)
    } catch (error) {
      setError(error.message)
    }

    setIsLoading(false)
  }

  const selectCommune = codeCommune => {
    const href = `/commune?codeCommune=${codeCommune}`
    const as = `/explore/commune/${codeCommune}`

    Router.push(href, as)
  }

  const reset = () => {
    setCommunes(null)
    setError(null)
    setIsLoading(false)
  }

  useEffect(() => {
    setBbox(communes ? computeBbox(communes) : null)
  }, [communes])

  return (
    <Page title={title} description={description} hasFooter={false}>
      <Header />
      <div className='explore-map-container'>
        <Mapbox
          error={error}
          loading={isLoading}
          bbox={bbox}
          hasSwitchStyle={false}
        >
          {({...mapboxProps}) => (
            <BANMap
              {...mapboxProps}
              departements={departements}
              communes={communes}
              selectDepartement={loadDepartement}
              selectCommune={selectCommune}
              reset={reset}
            />
          )}
        </Mapbox>
      </div>

      <style jsx>{`
        .explore-map-container {
          height: calc(100vh - 255px);
        }
      `}</style>
    </Page>
  )
}

Explore.propTypes = {
  departements: PropTypes.object.isRequired
}

Explore.getInitialProps = async () => {
  const {departements} = await getDepartements()
  const geojson = contoursToGeoJson(departements, departementContour)

  return {
    departements: geojson
  }
}

export default Explore
