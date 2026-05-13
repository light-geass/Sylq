"""
services/video_map.py
Static topic → curated YouTube resource mapping for GATE DA syllabus.

No API call needed — just a dict lookup.

Channels used:
  - 3Blue1Brown   → Math/ML intuition (best visualizations)
  - StatQuest     → Stats/ML explained simply
  - Gate Smashers → GATE-specific, exam-focused
  - NPTEL         → Official IIT lecture playlists
  - Neso Academy  → CS fundamentals

HOW IT WORKS:
  get_video_recommendations(weak_topics) does a partial-string match
  between the weak topic names (from AI study plan) and the keys in VIDEO_MAP.
  Returns at most 6 videos.
"""

VIDEO_MAP = {
    # ── Linear Algebra ─────────────────────────────────────────────────────
    "Eigenvalues": [
        {
            "topic":    "Eigenvalues & Eigenvectors",
            "title":    "Eigenvalues and Eigenvectors — 3Blue1Brown",
            "url":      "https://youtu.be/PFDu9oVAE-g",
            "channel":  "3Blue1Brown",
            "duration": "14 min",
        },
        {
            "topic":    "Eigenvalues & Eigenvectors",
            "title":    "Eigenvalues & Eigenvectors — Gate Smashers",
            "url":      "https://youtu.be/3-xfmbdzkqc",
            "channel":  "Gate Smashers",
            "duration": "32 min",
        },
    ],
    "Linear Algebra": [
        {
            "topic":    "Linear Algebra",
            "title":    "Essence of Linear Algebra (Full Playlist)",
            "url":      "https://youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
            "channel":  "3Blue1Brown",
            "duration": "Playlist (15 videos)",
        },
        {
            "topic":    "Linear Algebra",
            "title":    "Linear Algebra — NPTEL IIT Kharagpur",
            "url":      "https://youtube.com/playlist?list=PLbMVogVj5nJQ2vsW_hmyvVfO4GYWkaF2p",
            "channel":  "NPTEL",
            "duration": "Playlist",
        },
    ],
    "Matrix": [
        {
            "topic":    "Matrix Operations",
            "title":    "Matrix Multiplication — 3Blue1Brown",
            "url":      "https://youtu.be/XkY2DOUCWMU",
            "channel":  "3Blue1Brown",
            "duration": "10 min",
        },
    ],
    "Vector Space": [
        {
            "topic":    "Vector Spaces",
            "title":    "Abstract Vector Spaces — 3Blue1Brown",
            "url":      "https://youtu.be/TgKwz5Ikpc8",
            "channel":  "3Blue1Brown",
            "duration": "16 min",
        },
    ],
    "SVD": [
        {
            "topic":    "SVD",
            "title":    "Singular Value Decomposition — StatQuest",
            "url":      "https://youtu.be/nbBvuuNVfco",
            "channel":  "StatQuest",
            "duration": "11 min",
        },
    ],
    "Rank": [
        {
            "topic":    "Rank & Nullity",
            "title":    "Column Space & Null Space — 3Blue1Brown",
            "url":      "https://youtu.be/uQhTuRlWMxw",
            "channel":  "3Blue1Brown",
            "duration": "9 min",
        },
    ],

    # ── Probability & Statistics ─────────────────────────────────────────────
    "Bayes": [
        {
            "topic":    "Bayes Theorem",
            "title":    "Bayes Theorem — 3Blue1Brown",
            "url":      "https://youtu.be/HZGCoVF3YvM",
            "channel":  "3Blue1Brown",
            "duration": "15 min",
        },
        {
            "topic":    "Bayes Theorem",
            "title":    "Bayes Theorem — Gate Smashers",
            "url":      "https://youtu.be/GnvkRMcSZLo",
            "channel":  "Gate Smashers",
            "duration": "42 min",
        },
    ],
    "Probability": [
        {
            "topic":    "Probability",
            "title":    "Probability Fundamentals — StatQuest Playlist",
            "url":      "https://youtube.com/playlist?list=PLblh5JKOoLUK0FLuzwntyYI10UQFUhsY9",
            "channel":  "StatQuest",
            "duration": "Playlist",
        },
    ],
    "Hypothesis": [
        {
            "topic":    "Hypothesis Testing",
            "title":    "Hypothesis Testing — StatQuest",
            "url":      "https://youtu.be/0oc49DyA3hU",
            "channel":  "StatQuest",
            "duration": "12 min",
        },
        {
            "topic":    "Hypothesis Testing",
            "title":    "p-Values — StatQuest",
            "url":      "https://youtu.be/vemZtEM63GY",
            "channel":  "StatQuest",
            "duration": "11 min",
        },
    ],
    "Distribution": [
        {
            "topic":    "Probability Distributions",
            "title":    "Probability Distributions — StatQuest",
            "url":      "https://youtu.be/oI3hZJqXJuc",
            "channel":  "StatQuest",
            "duration": "9 min",
        },
    ],
    "Central Limit": [
        {
            "topic":    "Central Limit Theorem",
            "title":    "Central Limit Theorem — StatQuest",
            "url":      "https://youtu.be/YAlJCEDH2uY",
            "channel":  "StatQuest",
            "duration": "8 min",
        },
    ],
    "Correlation": [
        {
            "topic":    "Correlation & Covariance",
            "title":    "Covariance & Correlation — StatQuest",
            "url":      "https://youtu.be/qtaqvPAeEJY",
            "channel":  "StatQuest",
            "duration": "9 min",
        },
    ],

    # ── Calculus & Optimization ──────────────────────────────────────────────
    "Calculus": [
        {
            "topic":    "Calculus",
            "title":    "Essence of Calculus (Full Playlist)",
            "url":      "https://youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr",
            "channel":  "3Blue1Brown",
            "duration": "Playlist (12 videos)",
        },
    ],
    "Optimization": [
        {
            "topic":    "Optimization",
            "title":    "Gradient Descent — StatQuest",
            "url":      "https://youtu.be/sDv4f4s2SB8",
            "channel":  "StatQuest",
            "duration": "7 min",
        },
    ],
    "Taylor": [
        {
            "topic":    "Taylor Series",
            "title":    "Taylor Series — 3Blue1Brown",
            "url":      "https://youtu.be/3d6DsjIBzJ4",
            "channel":  "3Blue1Brown",
            "duration": "22 min",
        },
    ],

    # ── Machine Learning ─────────────────────────────────────────────────────
    "Regression": [
        {
            "topic":    "Regression",
            "title":    "Linear Regression — StatQuest",
            "url":      "https://youtu.be/nk2CQITm_eo",
            "channel":  "StatQuest",
            "duration": "27 min",
        },
        {
            "topic":    "Logistic Regression",
            "title":    "Logistic Regression — StatQuest",
            "url":      "https://youtu.be/yIYKR4sgzI8",
            "channel":  "StatQuest",
            "duration": "19 min",
        },
    ],
    "SVM": [
        {
            "topic":    "Support Vector Machine",
            "title":    "Support Vector Machines — StatQuest",
            "url":      "https://youtu.be/efR1C6CvhmE",
            "channel":  "StatQuest",
            "duration": "20 min",
        },
    ],
    "Decision Tree": [
        {
            "topic":    "Decision Trees",
            "title":    "Decision Trees — StatQuest",
            "url":      "https://youtu.be/7VeUPuFGJHk",
            "channel":  "StatQuest",
            "duration": "17 min",
        },
        {
            "topic":    "Random Forest",
            "title":    "Random Forests — StatQuest",
            "url":      "https://youtu.be/J4Wdy0Wc_xQ",
            "channel":  "StatQuest",
            "duration": "9 min",
        },
    ],
    "Neural Network": [
        {
            "topic":    "Neural Networks",
            "title":    "Neural Networks (Full Playlist) — 3Blue1Brown",
            "url":      "https://youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi",
            "channel":  "3Blue1Brown",
            "duration": "Playlist (4 videos)",
        },
    ],
    "Clustering": [
        {
            "topic":    "K-Means Clustering",
            "title":    "K-Means Clustering — StatQuest",
            "url":      "https://youtu.be/4b5d3muPQmA",
            "channel":  "StatQuest",
            "duration": "9 min",
        },
        {
            "topic":    "Hierarchical Clustering",
            "title":    "Hierarchical Clustering — StatQuest",
            "url":      "https://youtu.be/7xHsRkOdVwo",
            "channel":  "StatQuest",
            "duration": "11 min",
        },
    ],
    "PCA": [
        {
            "topic":    "PCA",
            "title":    "Principal Component Analysis — StatQuest",
            "url":      "https://youtu.be/FgakZw6K1QQ",
            "channel":  "StatQuest",
            "duration": "21 min",
        },
    ],
    "Bias": [
        {
            "topic":    "Bias-Variance Tradeoff",
            "title":    "Bias-Variance Tradeoff — StatQuest",
            "url":      "https://youtu.be/EuBBz3bI-aA",
            "channel":  "StatQuest",
            "duration": "6 min",
        },
    ],
    "Cross-Validation": [
        {
            "topic":    "Cross Validation",
            "title":    "Cross Validation — StatQuest",
            "url":      "https://youtu.be/fSytzGwwBVw",
            "channel":  "StatQuest",
            "duration": "6 min",
        },
    ],

    # ── AI ─────────────────────────────────────────────────────────────────
    "Search": [
        {
            "topic":    "AI Search Algorithms",
            "title":    "BFS & DFS — Gate Smashers",
            "url":      "https://youtu.be/pcKY4hjDrxk",
            "channel":  "Gate Smashers",
            "duration": "18 min",
        },
        {
            "topic":    "A* Search",
            "title":    "A* Search — Gate Smashers",
            "url":      "https://youtu.be/ySN5Wnu88nE",
            "channel":  "Gate Smashers",
            "duration": "22 min",
        },
    ],
    "Logic": [
        {
            "topic":    "Propositional Logic",
            "title":    "Propositional Logic — Gate Smashers",
            "url":      "https://youtu.be/nVBRqz_oBpg",
            "channel":  "Gate Smashers",
            "duration": "25 min",
        },
    ],

    # ── Programming & DS ────────────────────────────────────────────────────
    "Graph Algorithm": [
        {
            "topic":    "Graph Algorithms",
            "title":    "Graph Algorithms Playlist — Gate Smashers",
            "url":      "https://youtube.com/playlist?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y",
            "channel":  "Gate Smashers",
            "duration": "Playlist",
        },
    ],
    "Sorting": [
        {
            "topic":    "Sorting Algorithms",
            "title":    "Sorting Algorithms — Gate Smashers",
            "url":      "https://youtube.com/playlist?list=PLxCzCOWd7aiHcmS4i14bI0VrMbZTUvlTa",
            "channel":  "Gate Smashers",
            "duration": "Playlist",
        },
    ],
    "Dynamic Programming": [
        {
            "topic":    "Dynamic Programming",
            "title":    "Dynamic Programming — Gate Smashers",
            "url":      "https://youtube.com/playlist?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y",
            "channel":  "Gate Smashers",
            "duration": "Playlist",
        },
    ],

    # ── DBMS ────────────────────────────────────────────────────────────────
    "SQL": [
        {
            "topic":    "SQL & Relational Model",
            "title":    "SQL Full Course — Neso Academy",
            "url":      "https://youtube.com/playlist?list=PLBlnK6fEyqRi_CUQ-FXxgZZZDOrFeSZXi",
            "channel":  "Neso Academy",
            "duration": "Playlist",
        },
    ],
    "Normal Form": [
        {
            "topic":    "Normal Forms",
            "title":    "Database Normalization — Gate Smashers",
            "url":      "https://youtu.be/xoTyrdT9SZI",
            "channel":  "Gate Smashers",
            "duration": "30 min",
        },
    ],
}


def get_video_recommendations(weak_topics: list[str]) -> list[dict]:
    """
    Given a list of weak topic names, return up to 6 relevant video recommendations.
    Uses partial string matching — case insensitive.
    """
    recs = []
    seen_urls = set()

    for topic in weak_topics:
        topic_lower = topic.lower()
        for key, videos in VIDEO_MAP.items():
            if key.lower() in topic_lower or topic_lower in key.lower():
                for v in videos:
                    if v["url"] not in seen_urls:
                        recs.append(v)
                        seen_urls.add(v["url"])
                break  # one match per weak topic

        if len(recs) >= 6:
            break

    return recs[:6]
