-- Ciri khusus laporan: setelah klaim disetujui, pengklaim boleh melihatnya.
drop policy if exists "report_secrets_claimant_approved" on report_secrets;
create policy "report_secrets_claimant_approved" on report_secrets
  for select to authenticated
  using (exists (
    select 1 from claims c
    where c.found_report_id = report_secrets.report_id
      and c.claimant_id = auth.uid()
      and c.status in ('diterima', 'selesai')
  ));

-- RPC Functions for Claim Management
-- Alur: ajukan -> menunggu setuju -> disetujui -> komunikasi WA -> serah terima -> verifikasi -> selesai

create or replace function public.claims_setuju(claim_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Validasi: hanya boleh setuju klaim yang masih menunggu
  if (select status from claims where id = claim_id) != 'menunggu' then
    raise exception 'Klaim tidak dapat disetujui (status tidak valid)';
  end if;

  update claims
  set status = 'diterima',
      updated_at = now()
  where id = claim_id;
end;
$$;

create or replace function public.claims_tolak(claim_id uuid, alasan text)
returns void language plpgsql security definer as $$
begin
  update claims
  set status = 'ditolak',
      alasan_tolak = alasan,
      updated_at = now()
  where id = claim_id;
end;
$$;

create or replace function public.claims_verifikasi(claim_id uuid)
returns void language plpgsql security definer as $verify$
declare
  report_id uuid;
begin
  -- Validasi status
  if (select status from claims where id = claim_id) != 'diterima' then
    raise exception 'Klaim harus disetujui terlebih dahulu';
  end if;

  update claims
  set status = 'selesai',
      updated_at = now()
  where id = claim_id;

  -- Update laporan temuan ke 'kembali' (sudah dikembalikan)
  select found_report_id into report_id from claims where id = claim_id;
  if report_id is not null then
    update reports set status = 'kembali', updated_at = now() where id = report_id;
  end if;
end;
$verify$;