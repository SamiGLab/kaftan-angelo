# External link monitoring

The existing Monday schedule is unchanged. The workflow builds the real site,
runs the internal page/asset audit, and checks HTTP(S) anchor destinations in the
generated HTML. No social network or editorial-source domain is silently skipped.

The external checker uses curl with HTTP/1.1. This avoids the reproducible HTTP/2
failure at the Canadian Conservation Institute URL without removing its citation.
It follows redirects, deduplicates URLs after stripping fragments, limits parallel
requests to eight, and retries uncertain responses once. Private literal addresses
and credential-bearing source URLs are rejected without printing their values.

## Results

- **Successful:** HTTP 2xx, except 202. This confirms an HTTP response, not account
  ownership, intended page content, form submission or a successful sale.
- **Broken:** HTTP 404 or 410. The workflow fails and maintains one bot-owned issue.
- **Unverified:** 202, 401, 403, 429, 5xx, other unexpected statuses, curl errors,
  certificate failures or timeouts. These are shown separately in the summary and
  report with a workflow warning. They are never counted as successful or treated
  as proof of a broken URL. Check them in a browser.

An empty scan, missing curl or a run with no successful responses fails. The scan
has a four-minute request budget; pending destinations are marked unverified when
it expires. Reports are retained for seven days as `external-link-report`.
The action summary contains the same report. Existing confirmed-link issues close
only after a complete run with no broken AND no unverified destinations. A checker
failure remains a failed workflow even though report-upload steps run afterward.

Historic red workflow runs do not change when the workflow is repaired. Inspect the
newest run's timestamp and report rather than the number of old red entries.

## Local verification

```sh
python _dev/scripts/test_external_links.py
npm run build
python _dev/scripts/site_audit.py dist
python _dev/scripts/check_external_links.py dist --output /path/to/link-report
```

Tests use a local HTTP server to exercise successful responses, redirects, 404/410,
authentication blocks, rate limiting and server errors. The workflow itself must
also be manually run after publishing a change.
