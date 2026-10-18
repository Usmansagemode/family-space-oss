import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useItemMutationsCore } from '@family/hooks'
import type { Item } from '@family/types'

type Props = {
  item: Item | null
  spaceId: string
  familyId: string
  spaceColorAccent?: string
  visible: boolean
  onClose: () => void
}

export function EditItemModal({
  item,
  spaceId,
  familyId,
  spaceColorAccent = '#3A7DB5',
  visible,
  onClose,
}: Props) {
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [description, setDescription] = useState('')

  const { update, remove } = useItemMutationsCore(spaceId, familyId, {
    calendarId: null,
    getToken: () => Promise.resolve(null),
  })

  // Reset form when modal opens with an item
  useEffect(() => {
    if (visible && item) {
      setTitle(item.title)
      setQuantity(item.quantity ?? '')
      setDescription(item.description ?? '')
    }
  }, [visible, item])

  function handleSave() {
    if (!item || !title.trim()) return
    update.mutate(
      {
        id: item.id,
        title: title.trim(),
        quantity: quantity.trim() || undefined,
        description: description.trim() || undefined,
      },
      { onSuccess: onClose },
    )
  }

  function handleDelete() {
    if (!item) return
    Alert.alert('Delete item', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(item, { onSuccess: onClose }),
      },
    ])
  }

  const isPending = update.isPending || remove.isPending

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
          <Text className="text-base font-semibold text-ink">Edit Item</Text>
          <Pressable
            onPress={handleSave}
            disabled={isPending || !title.trim()}
            hitSlop={12}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: title.trim() && !isPending ? spaceColorAccent : '#8A8799' }}
            >
              {update.isPending ? 'Saving…' : 'Save'}
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
              placeholder="Item name…"
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
              returnKeyType="next"
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Note (optional)
            </Text>
            <TextInput
              className="text-base text-ink bg-white border border-line rounded-xl px-4 py-3"
              placeholder="Any extra details…"
              placeholderTextColor="#8A8799"
              value={description}
              onChangeText={setDescription}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={isPending || !title.trim()}
            className="rounded-2xl py-4 items-center active:opacity-80"
            style={{ backgroundColor: title.trim() ? spaceColorAccent : '#E5E3DE' }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: title.trim() ? '#FFFFFF' : '#8A8799' }}
            >
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </Text>
          </Pressable>

          {/* Delete */}
          <Pressable
            onPress={handleDelete}
            disabled={isPending}
            className="items-center py-2"
            hitSlop={8}
          >
            <Text className="text-sm font-medium text-red-500">
              {remove.isPending ? 'Deleting…' : 'Delete item'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
