Hi! Your map of [{{ARTIST}} - {{TITLE}}](https://osu.ppy.sh/beatmapsets/{{BEATMAPSET_ID}}) is going to be up for voting in the **{{ROUND_NAME}}** round of Project Loved. {% if GAME_MODES %}Polls{% else %}A poll{% endif %} will be opened **{{POLL_START}}** to see if the community wants your map Loved.

{% if GAME_MODES %}
Your map is being nominated for **{{GAME_MODES}}**. If its polls receive enough "Yes" votes (listed below), it can be moved to the Loved category! Note that even if some modes don't pass the voting, the passing ones can be moved to Loved, and you don't need to delete any difficulties.

{{THRESHOLDS}}
{% else %}
Your map is being nominated for **{{GAME_MODE}}**. If its poll receives **{{THRESHOLD}}** or more "Yes" votes, it can be moved to the Loved category!
{% endif %}

{% if EXCLUDED_DIFFS %}{{EXCLUDED_DIFFS}} will be left unranked regardless of the voting.

{% endif %}Please let **[{{ROUND_AUTHOR_NAME}}](https://osu.ppy.sh/users/{{ROUND_AUTHOR_ID}})** know if your mapset has any guest or collab mappers, so they can message them and credit them properly too.{% if GUESTS %} We have already contacted **{{GUESTS}}** about their guest difficulties in this mapset.{% endif %}


If you **do not** want your map to be put up for Loved voting, let **[{{ROUND_AUTHOR_NAME}}](https://osu.ppy.sh/users/{{ROUND_AUTHOR_ID}})** know and they'll remove it from the list.

Thanks!

About Project Loved: <https://osu.ppy.sh/wiki/Community/Project_Loved>
