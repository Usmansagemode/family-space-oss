// Initialize Supabase before any hooks run
import './src/lib/supabase'
import './global.css'

import { useState } from 'react'
import { View } from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import type { Space } from '@family/types'
import { AuthProvider, useAuthContext } from './src/contexts/auth'
import { LoginScreen } from './src/screens/LoginScreen'
import { SpacesScreen } from './src/screens/SpacesScreen'
import { ItemsScreen } from './src/screens/ItemsScreen'
import { CalendarScreen } from './src/screens/CalendarScreen'
import { ExpensesScreen } from './src/screens/ExpensesScreen'
import { SearchScreen } from './src/screens/SearchScreen'
import { TabBar, type Tab } from './src/components/TabBar'

const queryClient = new QueryClient()

function AppNavigator() {
  const { user } = useAuthContext()
  const [tab, setTab] = useState<Tab>('board')
  const [focusSpace, setFocusSpace] = useState<Space | null>(null)

  if (!user) return <LoginScreen />

  // Focus mode — full screen, no tab bar
  if (focusSpace) {
    return (
      <ItemsScreen
        space={focusSpace}
        onBack={() => setFocusSpace(null)}
      />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Tab screens — keep mounted to preserve query cache */}
      <View style={{ flex: 1, display: tab === 'board' ? 'flex' : 'none' }}>
        <SpacesScreen onFocusSpace={setFocusSpace} />
      </View>
      <View style={{ flex: 1, display: tab === 'calendar' ? 'flex' : 'none' }}>
        <CalendarScreen />
      </View>
      <View style={{ flex: 1, display: tab === 'expenses' ? 'flex' : 'none' }}>
        <ExpensesScreen />
      </View>
      <View style={{ flex: 1, display: tab === 'search' ? 'flex' : 'none' }}>
        <SearchScreen />
      </View>

      <TabBar activeTab={tab} onChangeTab={setTab} />
    </View>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  )
}
