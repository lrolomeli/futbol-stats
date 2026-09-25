'use client'

import FormacionEditor from '@/components/FormacionEditor'
import { CLAVE_OFENSIVA } from '@/lib/formacion'

export default function FormacionOfensivaPage() {
  return (
    <FormacionEditor
      clave={CLAVE_OFENSIVA}
      titulo="Formación Ofensiva"
      hrefVolver="/admin"
      prefijoRespaldo="formacion-ofensiva"
      otraRuta={{ href: '/admin/formacion', label: 'la formación defensiva' }}
    />
  )
}
