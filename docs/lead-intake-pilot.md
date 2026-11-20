# Lead intake pilot

Use a dedicated Safar ERP test company on the isolated Lovable Cloud stack described in [the release guide](lovable-cloud-release.md). Test with fictitious contact details and synthetic document images.

## Sales workspace

Open `/sop/pipeline`. The source filter includes Meta lead forms, and the existing search searches the campaign reference before applying the result limit. The lead card and brief show the campaign when one is available. Staff can work the existing assignment, qualification and follow-up stages.

## Meta instant forms

Use two test companies and distinct test Pages/forms. Configure each Page/form for the intended company through its own company integration settings. Follow [the Meta intake setup](meta-instant-form-intake.md) for the callback, Page `leadgen` subscription, and authorized Page token. The campaign reference is optional and depends on the ad access granted by Meta.

Submit a test lead. The sales workspace should show one new record in the mapped company. Deliver the same event again to check that it keeps the same lead. Open the other company and verify it cannot see the record. Avoid copying Page tokens or payloads into the troubleshooting record.

## WhatsApp intake

Use a test conversation with a clear travel request. In the conversation, open **دليل العمل → مسودة من الرسائل**, review the populated and missing fields, then save it. Open the same conversation again and verify the existing lead is reused. Check a conversation that belongs to a different company or operator.

## Identity document review

Use a supported synthetic image attachment in an incoming WhatsApp test conversation with a linked test customer. Choose **اقرأ الاسم والجنسية من الصورة**, review the proposed fields against the image and save only the fields you confirm. When a field cannot be recognized, leave it unchanged or transcribe it during review. Test that an unrelated conversation and an updated customer record are both blocked.

Run `node --experimental-strip-types scripts/verify-whatsapp-image-ocr.mjs` after building to check image recognition with the packaged Arabic and English models.

[Meta lead form webhook guide](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/) · [Meta lead retrieval requirements](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving/)
