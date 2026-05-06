import { MapaVenuesLoader } from './MapaVenuesLoader'

export default function MapaPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MapaVenuesLoader />
    </div>
  )
}
