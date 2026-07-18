import urllib.request

url = "https://news.google.com/rss/articles/CBMi2wFBVV95cUxOU041ZWFRTGxFc0QzdzNFVWlqc2lhaFVWd1lKVXk5SU8yN0xPUUx3NTM1VWxZQlRhSjBnME9pcmNfZ3RUSWM1LV81TjVRelR6VmduckR5dWZoMHJfNGxBTTh3blBOUEFXR3NiMkVMaUE2bkd1UFJJbmR2dndYcUNRSEk1a1N6aUZzSk5RTmotNWRvMmxmcFhjWkI4WHBtTWRfVlZac1VXdnRfYjlYQlZEdDlObVBBTHZRRngwX3NEeDF2R1dxOEMyZnAzenk5QnhXVlZoUDM0SDh0QXPSAeABQVVfeXFMT2lDSjJianJUci1scnN2aVdndThRSEZMdE5xSFlfU0dEV3BXa3o1a05EQ2pNOGFXdU9mSlJvd0VXcjFaT3EySEJyZ2p4X0tNMFBDY250Tl9Xc2JhZDJJdVZmbUc2bnpvZXNPaFgtM200dVlDMURXenZyOVlrUXJYN01lVEZBQktGUWUxNEdpazU0MDZSUWRMdHBMb0N2LWtxekVOaElJV0R4UWVuQ0lENkVyLVN0eG5hUW83dGhyMGVaN2pmUzhmNWN1ZHBNZkhPY0lYb2xaT3BCbVg4WWViRFY?oc=5"

req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as response:
    final_url = response.geturl()
    html = response.read().decode("utf-8", errors="ignore")

print("URL FINALE DOPO REINDIRIZZAMENTO:")
print(final_url)
print()
print("PRIMI 500 CARATTERI DELLA PAGINA:")
print(html[:500])
