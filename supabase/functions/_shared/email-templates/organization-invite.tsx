/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'

export interface OrganizationInviteEmailProps {
  inviterName: string
  organizationName: string
  roleLabel: string
  acceptUrl: string
}

export const OrganizationInviteEmail = ({ inviterName, organizationName, roleLabel, acceptUrl }: OrganizationInviteEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <meta charSet="UTF-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <style>{darkModeCss}</style>
    </Head>
    <Preview>دعوة للانضمام إلى {organizationName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Safar<span style={brandAccent}>ERP</span></Text>
        <Heading style={h1}>دعوة للانضمام إلى فريق العمل</Heading>
        <Text style={text}>
          دعاك <strong>{inviterName}</strong> للانضمام إلى <strong>{organizationName}</strong> بدور <strong>{roleLabel}</strong>.
        </Text>
        <Text style={text}>الرابط صالح لمدة 7 أيام، وستختار كلمة مرور حسابك بنفسك.</Text>
        <Button className="dm-btn" style={button} href={acceptUrl}>قبول الدعوة</Button>
        <Text style={small}>إذا لم يعمل الزر، انسخ الرابط التالي:<br />{acceptUrl}</Text>
        <Text style={footer}>إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذه الرسالة بأمان.</Text>
      </Container>
    </Body>
  </Html>
)

export default OrganizationInviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: '#0D2342', margin: '0 0 24px', letterSpacing: '0.5px' }
const brandAccent = { color: '#B59150' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0D2342', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.8', margin: '0 0 18px' }
const button = { backgroundColor: '#0D2342', color: '#F8F5ED', fontSize: '14px', border: '1px solid #0D2342', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
const small = { fontSize: '12px', color: '#7b8497', margin: '24px 0 0', wordBreak: 'break-all' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Keep this CSS free of >, &, and quotes (React may escape text children).
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #B59150 !important; color: #0D2342 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #B59150 !important; color: #0D2342 !important; }
`
