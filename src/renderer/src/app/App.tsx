import type { ReactElement } from 'react'
import { SourcePickerScreen } from '../components/sources/SourcePickerScreen'
import { BrowseScreen } from '../components/browse/BrowseScreen'
import { useUiStore } from '../state/useUiStore'

function App(): ReactElement {
  const isBrowsing = useUiStore((s) => s.activeSourceId !== null || s.activeIsFavorites)

  return isBrowsing ? <BrowseScreen /> : <SourcePickerScreen />
}

export default App
