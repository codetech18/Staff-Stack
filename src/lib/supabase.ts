import { createClient } from '@supabase/supabase-js'
import { isDemo, demoQuery, demoRpc } from './demo'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const liveClient = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder')

export const isSupabaseConfigured = Boolean(url && key && !url.includes('placeholder'))

export const supabase: typeof liveClient = isDemo
  ? new Proxy(liveClient, {
      get(target, property) {
        if (property === 'rpc') return demoRpc
        if (property === 'from') return demoQuery
        if (property === 'functions')
          return {
            invoke: async () => ({
              data: null,
              error: new Error('Email and account actions are unavailable in the local demo.'),
            }),
          }
        return Reflect.get(target, property)
      },
    })
  : liveClient
