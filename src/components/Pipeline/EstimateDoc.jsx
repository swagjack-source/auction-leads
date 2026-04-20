import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 10, padding: '40pt 48pt', color: '#14161A' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, borderBottom: '1pt solid #E8E8E6', paddingBottom: 16 },
  logo:      { width: 120, height: 'auto' },
  companyBlock: { textAlign: 'right' },
  companyName:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1E3A5F' },
  companyMeta:  { fontSize: 8.5, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#9AA0AB', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 18 },
  row:       { flexDirection: 'row', gap: 16, marginBottom: 4 },
  field:     { flex: 1 },
  label:     { fontSize: 8, color: '#9AA0AB', marginBottom: 2 },
  value:     { fontSize: 10, color: '#14161A' },
  table:     { border: '1pt solid #E8E8E6', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  tableRow:  { flexDirection: 'row', borderBottom: '1pt solid #E8E8E6', padding: '8pt 12pt', justifyContent: 'space-between' },
  tableRowTotal: { flexDirection: 'row', padding: '9pt 12pt', justifyContent: 'space-between', backgroundColor: '#EAF0F8' },
  tableLabel:    { fontSize: 10, color: '#3A3E46' },
  tableValue:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#14161A' },
  tableLabelTotal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#2B4468' },
  tableValueTotal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#2B4468' },
  footer:    { marginTop: 32, borderTop: '1pt solid #E8E8E6', paddingTop: 12 },
  footerText: { fontSize: 8.5, color: '#9AA0AB', marginBottom: 3 },
})

export default function EstimateDoc({ lead, bid, labourHours, labourCost, overhead, total }) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const validUntil = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Image src="/CT DenverSE logo - Black.png" style={styles.logo} />
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>Caring Transitions Denver Southeast</Text>
            <Text style={styles.companyMeta}>{today}</Text>
          </View>
        </View>

        {/* Client Info */}
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.row}>
          <View style={styles.field}><Text style={styles.label}>Name</Text><Text style={styles.value}>{lead.name || '—'}</Text></View>
          <View style={styles.field}><Text style={styles.label}>Address</Text><Text style={styles.value}>{lead.address || '—'}</Text></View>
          <View style={styles.field}><Text style={styles.label}>ZIP</Text><Text style={styles.value}>{lead.zip_code || '—'}</Text></View>
        </View>

        {/* Scope */}
        <Text style={styles.sectionTitle}>Scope of Work</Text>
        <View style={styles.row}>
          <View style={styles.field}><Text style={styles.label}>Job Type</Text><Text style={styles.value}>{lead.job_type || '—'}</Text></View>
          <View style={styles.field}><Text style={styles.label}>Square Footage</Text><Text style={styles.value}>{lead.square_footage ? `${lead.square_footage} sq ft` : '—'}</Text></View>
          <View style={styles.field}><Text style={styles.label}>Density</Text><Text style={styles.value}>{lead.density || '—'}</Text></View>
          <View style={styles.field}><Text style={styles.label}>Item Quality</Text><Text style={styles.value}>{lead.item_quality_score ? `${lead.item_quality_score}/10` : '—'}</Text></View>
        </View>

        {/* Line Items */}
        <Text style={styles.sectionTitle}>Estimate Breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Labour — {labourHours} hrs @ $22/hr</Text>
            <Text style={styles.tableValue}>${labourCost.toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Overhead (15%)</Text>
            <Text style={styles.tableValue}>${overhead.toLocaleString()}</Text>
          </View>
          <View style={styles.tableRowTotal}>
            <Text style={styles.tableLabelTotal}>Total Bid</Text>
            <Text style={styles.tableValueTotal}>${total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This estimate is valid for 30 days (until {validUntil}).</Text>
          <Text style={styles.footerText}>Caring Transitions Denver Southeast · caringtransitions.com</Text>
          <Text style={styles.footerText}>Questions? Contact us at info@ctdenverse.com</Text>
        </View>

      </Page>
    </Document>
  )
}
