/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>إعادة تعيين كلمة المرور في {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          Safar<span style={brandAccent}>ERP</span>
        </Text>
        <Heading style={h1}>إعادة تعيين كلمة المرور</Heading>
        <Text style={text}>
          تلقّينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك في {siteName}.
          اضغط على الزر أدناه لاختيار كلمة مرور جديدة.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          إعادة تعيين كلمة المرور
        </Button>
        <Text style={footer}>
          إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.
          لن يتم تغيير كلمة المرور الخاصة بك.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const brand = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#0D2342',
  margin: '0 0 24px',
  letterSpacing: '0.5px',
}
const brandAccent = { color: '#B59150' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0D2342',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#0D2342',
  color: '#F8F5ED',
  fontSize: '14px',
  border: '1px solid #0D2342',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #B59150 !important; color: #0D2342 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #B59150 !important; color: #0D2342 !important; }
  [data-ogsb] .dm-btn { background-color: #B59150 !important; color: #0D2342 !important; }
`
