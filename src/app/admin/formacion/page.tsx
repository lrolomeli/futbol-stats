'use client'

import FormacionEditor from '@/components/FormacionEditor'
import { CLAVE_DEFENSIVA } from '@/lib/formacion'

export default function FormacionPage() {
  return (
    <FormacionEditor
      clave={CLAVE_DEFENSIVA}
      titulo="Formación Defensiva"
      hrefVolver="/admin"
      prefijoRespaldo="formacion"
      otraRuta={{ href: '/formacion-ofensiva', label: 'la formación ofensiva' }}
    />
  )
}
