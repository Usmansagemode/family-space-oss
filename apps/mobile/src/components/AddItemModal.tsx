import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useItemMutationsCore } from '@family/hooks'

type Props = {
  spaceId: string
  familyId: string
  spaceColorAccent?: string
  visible: boolean
  onClose: () => void
}

export function AddItemModal({ spaceId, familyId, spaceColorAccent = '#3A7DB5', visible, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const { create } = useItemMutationsCore(spaceId, familyId, {
    calendarId: null,
    getToken: () => Promise.resolve(null),
  })

  function handleAdd() {
    const trimmed = title.trim()
    if (!trimmed) return
    create.mutate(
      { title: trimmed, quantity: quantity.trim() || undefined },
      {
        onSuccess: () => {
          setTitle('')
          setQuantity('')
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-sand"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-line bg-foam">
          <Pressable onPress={onClose} hitSlop={12}>
            <Text className="text-base text-ink-soft">Cancel</Text>
          </Pressable>
          <Text className="text-base font-semibold text-ink">Add Item</Text>
          <Pressable
            onPress={handleAdd}
            disabled={create.isPending || !title.trim()}
            hitSlop={12}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: title.trim() ? spaceColorAccent : '#8A8799' }}
            >
              {create.isPending ? 'Adding…' : 'Add'}
            </Text>
          </Pressable>
        </View>

        {/* Form */}
        <View className="p-5 gap-5">
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Item
            </Text>
            <TextInput
              className="text-base text-ink bg-white border border-line rounded-xl px-4 py-3"
              placeholder="e.g. Milk, Take out trash…"
              placeholderTextColor="#8A8799"
              value={title}
              onChangeText={setTitle}
              autoFocus
              returnKeyType="next"
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Quantity (optional)
            </Text>
            <TextInput
              className="text-base text-ink bg-white border border-line rounded-xl px-4 py-3"
              placeholder="e.g. 2, 500g…"
              placeholderTextColor="#8A8799"
              value={quantity}
              onChangeText={setQuantity}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>

          {/* Add button for easy tap */}
          <Pressable
            onPress={handleAdd}
            disabled={create.isPending || !title.trim()}
            className="rounded-2xl py-4 items-center mt-2 active:opacity-80"
            style={{ backgroundColor: title.trim() ? spaceColorAccent : '#E5E3DE' }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: title.trim() ? '#FFFFFF' : '#8A8799' }}
            >
              {create.isPending ? 'Adding…' : 'Add Item'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
