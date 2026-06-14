import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 2 * 1024 * 1024;
const allowedKinds = new Set(['shop-logo', 'reward-image', 'promo-banner']);

function safeSegment(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
}

function fileExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, message: 'ยังไม่ได้ตั้งค่า BLOB_READ_WRITE_TOKEN ใน Environment Variables ของ Vercel' },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const shopId = safeSegment(String(formData.get('shopId') || ''), 'unknown-shop');
    const kind = safeSegment(String(formData.get('kind') || ''), 'image');

    if (!allowedKinds.has(kind)) {
      return NextResponse.json({ ok: false, message: 'ประเภทการอัปโหลดรูปไม่ถูกต้อง' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'ไม่พบไฟล์รูปภาพ' }, { status: 400 });
    }

    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ ok: false, message: 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP เท่านั้น' }, { status: 400 });
    }

    if (file.size > maxBytes) {
      return NextResponse.json({ ok: false, message: 'ไฟล์รูปใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 2 MB' }, { status: 400 });
    }

    const originalName = safeSegment(file.name.replace(/\.[^.]+$/, ''), 'image');
    const storageKey = `loyalty/${shopId}/${kind}/${Date.now()}-${originalName}.${fileExtension(file)}`;
    const blob = await put(storageKey, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
      storageKey: blob.pathname,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('[storage:upload]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'อัปโหลดรูปไม่สำเร็จ' },
      { status: 500 },
    );
  }
}
