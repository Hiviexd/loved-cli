---
layout: post
title: "{{TITLE}}"
date: {{DATE}} {{TIME}} +0000
series: project_loved
---

{{HEADER}}

![](/wiki/shared/news/banners/project-loved-2.jpg)
{% if INTRO %}

{{INTRO}}
{% endif %}

### Navigation

{% for m in GAME_MODES %}
- **[{{m.longName}}](#{{m.longName}})** ([Download pack]({{PACK_URLS[m.id]}}))
{% endfor %}
{% if VIDEO %}

## Summary

{{VIDEO}}
{% endif %}

{{NOMINATIONS}}

---

{{OUTRO}}

—{{AUTHOR}}
