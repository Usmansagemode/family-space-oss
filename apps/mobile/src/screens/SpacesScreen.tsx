import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { LogOut } from 'lucide-react-native'
import { useSpaces, useUserFamily } from '@family/hooks'
import type { Space } from '@family/types'
import { useAuthContext } from '../contexts/auth'
import { SpaceCard } from '../components/SpaceCard'

type Props = {
  onFocusSpace: (space: Space) => void
}

export function SpacesScreen({ onFocusSpace }: Props) {
  const { user, signOut } = useAuthContext()
  const { data: family, isLoading: familyLoading } = useUserFamily(user?.id)
  const {
    data: spaces = [],
    isLoading: spacesLoading,
    refetch,
  } = useSpaces(family?.id ?? '')

  const isLoading = familyLoading || spacesLoading

  const people = spaces.filter((s) => s.type === 'person')
  const stores = spaces.filter((s) => s.type === 'store')

  return (
    <View className="flex-1 bg-sand">
      {/* ── App header ── */}
      <View
        className="flex-row items-center px-4 pt-14 pb-3 bg-foam border-b border-line"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-2.5 flex-1">
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/family-space-logo.jpg')}
            style={{ width: 28, height: 28, borderRadius: 8 }}
          />
          <View>
            <Text className="text-sm font-bold text-ink leading-tight tracking-tight">
              Family Space
            </Text>
            {family?.name ? (
              <Text className="text-[11px] text-ink-muted leading-tight">
                {family.name}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable onPress={signOut} hitSlop={8} className="w-8 h-8 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(28,27,42,0.06)' }}>
          <LogOut size={16} color="#8A8799" />
        </Pressable>
      </View>

      {familyLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4A8DB8" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 40,
            gap: 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor="#4A8DB8"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* People section */}
          {people.length > 0 && (
            <View className="gap-3">
              <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                People
              </Text>
              {people.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  onFocus={() => onFocusSpace(space)}
                />
              ))}
            </View>
          )}

          {/* Stores section */}
          {stores.length > 0 && (
            <View className="gap-3">
              <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Stores
              </Text>
              {stores.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  onFocus={() => onFocusSpace(space)}
                />
              ))}
            </View>
          )}

          {spaces.length === 0 && !isLoading && (
            <Text className="text-center text-ink-muted mt-16 text-base leading-6">
              No spaces yet.{'\n'}Open the web app to add some.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  )
}
