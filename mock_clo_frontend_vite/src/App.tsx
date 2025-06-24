import { AptosProvider } from './providers/AptosProvider'
import Home from './components/Home'

function App() {
  return (
    <AptosProvider>
      <Home />
    </AptosProvider>
  )
}

export default App 