"""
services/exam_rules.py
Rules engine for different exam formats and scoring logic.
"""

def get_exam_type_counts(exam_name: str, total: int) -> tuple[int, int, int]:
    """Returns (mcq_count, nat_count, msq_count) based on exam format."""
    exam = (exam_name or "").lower().replace("-", " ").strip()
    import re
    exam = re.sub(r'\s+', ' ', exam)
    
    if "jee main" in exam or "mains" in exam or exam == "jee":
        # JEE Main format: mostly MCQ, some Numerical (NAT). No MSQ.
        # Approx 80% MCQ, 20% NAT
        nat = total // 5
        mcq = total - nat
        return mcq, nat, 0
    elif "jee adv" in exam:
        # JEE Advanced pattern varies, but commonly has a mix of MCQ, MSQ, and NAT.
        # Let's approximate: 40% MCQ, 30% MSQ, 30% NAT
        mcq = round(total * 0.40)
        msq = round(total * 0.30)
        nat = total - mcq - msq
        return mcq, nat, msq
    elif "cat" in exam:
        # CAT: ~70% MCQ, ~30% NAT
        nat = round(total * 0.30)
        mcq = total - nat
        return mcq, nat, 0
    elif "neet" in exam or "mht cet" in exam:
        # NEET and MHT CET: 100% MCQ
        return total, 0, 0
    else:
        # Default / GATE format: 2:1:1 ratio
        mcq = total // 2
        nat = total // 4
        msq = total - mcq - nat
        return mcq, nat, msq

def apply_mark_distribution(exam_name: str, questions: list[dict], total: int) -> list[dict]:
    """Applies mark distribution based on exam pattern."""
    exam = (exam_name or "").lower().replace("-", " ").strip()
    import re
    exam = re.sub(r'\s+', ' ', exam)
    
    # Only GATE has explicit 1-mark and 2-mark questions we need to forcefully balance to 7:6
    if "gate" in exam or not exam:
        import random
        two_mark_target = round(total * 7 / 13)
        one_mark_target = total - two_mark_target
        
        two_mark = [q for q in questions if q.get("marks") == 2]
        one_mark  = [q for q in questions if q.get("marks") == 1]
        
        # Trim if we have too many of either
        if len(two_mark) > two_mark_target:
            two_mark = random.sample(two_mark, two_mark_target)
        if len(one_mark) > one_mark_target:
            one_mark = random.sample(one_mark, one_mark_target)
            
        return two_mark + one_mark
        
    # For JEE/NEET, questions might have fixed marks and we don't need a specific ratio.
    # Just return the questions as-is (they are already limited to 'total').
    return questions

def get_scoring_penalty(exam_name: str, question_type: str, marks: int) -> float:
    """Returns the negative penalty for a wrong answer."""
    exam = (exam_name or "").lower().replace("-", " ").strip()
    import re
    exam = re.sub(r'\s+', ' ', exam)
    
    if "jee main" in exam or "mains" in exam or exam == "jee":
        # JEE Main: +4 correct, -1 wrong. Penalty is -abs(marks / 4)
        return -abs(marks / 4)
    elif "jee adv" in exam:
        # JEE Advanced: typically -1 for MCQ, -2 for MSQ, and 0 for NAT (varies)
        if question_type == "MCQ":
            return -1.0
        elif question_type == "MSQ":
            return -2.0
        return 0.0
    elif "cat" in exam:
        # CAT: +3 correct, -1 wrong. No penalty for NAT.
        if question_type == "MCQ":
            return -1.0
        return 0.0
    elif "neet" in exam:
        # NEET: +4 correct, -1 wrong. Only MCQ.
        if question_type == "MCQ":
            return -abs(marks / 4)
        return 0.0
    elif "mht cet" in exam:
        # MHT CET has no negative marking
        return 0.0
    else:
        # GATE
        if question_type == "MCQ":
            return -round(marks / 3, 4)
        return 0.0 # NAT and MSQ have no penalty in GATE

def get_exam_duration(exam_name: str, total_marks: int, total_questions: int) -> int:
    """Returns suggested duration in minutes."""
    exam = (exam_name or "").lower().replace("-", " ").strip()
    import re
    exam = re.sub(r'\s+', ' ', exam)
    
    if "jee main" in exam or "mains" in exam or exam == "jee":
        # JEE Main: typically 75 questions in 180 minutes -> ~2.4 mins per question
        return round(total_questions * 2.4)
    elif "jee adv" in exam:
        # JEE Advanced: typically 54 questions in 180 minutes -> ~3.3 mins per question
        return round(total_questions * 3.3)
    elif "cat" in exam:
        # CAT: 66 questions in 120 minutes -> ~1.82 mins per question
        return round(total_questions * 1.82)
    elif "neet" in exam:
        # NEET: 180 questions in 180 minutes -> 1 min per question
        return total_questions
    elif "mht cet pcm" in exam:
        # MHT CET PCM: 150 questions in 180 minutes -> 1.2 mins per question
        return round(total_questions * 1.2)
    elif "mht cet pcb" in exam:
        # MHT CET PCB: 200 questions in 180 minutes -> 0.9 mins per question
        return round(total_questions * 0.9)
    else:
        # GATE: 65 questions in 180 minutes -> ~2.7 mins per question or 1 min per mark.
        return total_marks
