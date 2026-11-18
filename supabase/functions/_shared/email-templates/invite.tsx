/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <meta charSet="UTF-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <style>{darkModeCss}</style>
    </Head>
    <Preview>تمت دعوتك للانضمام إلى {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          Safar<span style={brandAccent}>ERP</span>
        </Text>
        <Heading style={h1}>تمت دعوتك للانضمام</Heading>
        <Text style={text}>
          تمت دعوتك للانضمام إلى{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . اضغط على الزر أدناه لقبول الدعوة وإنشاء حسابك.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          قبول الدعوة
        </Button>
        <Text style={footer}>
          إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذه الرسالة بأمان.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
const link = { color: '#0D2342', textDecoration: 'underline' }
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
