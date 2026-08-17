import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(req: NextRequest) {
  try {
    const { attemptId, answers } = await req.json() as {
      attemptId: string
      answers: { questionId: number; selectedAnswer: string }[]
    }

    if (!attemptId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const admin = makeAdmin()

    // Fetch all questions with correct answers
    const { data: questions, error: qErr } = await admin
      .from('quiz_questions')
      .select('id, correct_answer, points')
      .eq('is_active', true)

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

    const questionMap = new Map(
      (questions ?? []).map((q: { id: number; correct_answer: string; points: number }) => [q.id, q])
    )

    // Calculate scores
    let score = 0
    let correctAnswers = 0
    let wrongAnswers = 0
    const maxScore = (questions ?? []).reduce((sum: number, q: { points: number }) => sum + q.points, 0)

    const answerRows = answers.map(a => {
      const q = questionMap.get(a.questionId)
      const isCorrect = q ? q.correct_answer === a.selectedAnswer : false
      const pointsEarned = isCorrect && q ? q.points : 0
      if (isCorrect) { score += pointsEarned; correctAnswers++ }
      else wrongAnswers++
      return {
        attempt_id: attemptId,
        question_id: a.questionId,
        selected_answer: a.selectedAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      }
    })

    // Insert answers
    const { error: ansErr } = await admin.from('quiz_answers').insert(answerRows)
    if (ansErr) return NextResponse.json({ error: ansErr.message }, { status: 500 })

    // Update attempt
    const completedAt = new Date().toISOString()
    const { error: updateErr } = await admin
      .from('quiz_attempts')
      .update({ score, correct_answers: correctAnswers, wrong_answers: wrongAnswers, completed_at: completedAt })
      .eq('id', attemptId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Count total participants
    const { count: totalParticipants } = await admin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .not('completed_at', 'is', null)

    // Calculate rank: how many completed attempts have a higher score, or same score but more correct answers, or same score/correct but finished earlier
    const { count: betterCount } = await admin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .not('completed_at', 'is', null)
      .neq('id', attemptId)
      .or(`score.gt.${score},and(score.eq.${score},correct_answers.gt.${correctAnswers}),and(score.eq.${score},correct_answers.eq.${correctAnswers},completed_at.lt.${completedAt})`)

    const rank = (betterCount ?? 0) + 1
    const qualified = correctAnswers >= 9

    // isWinner: this attempt is the top qualified attempt
    let isWinner = false
    if (qualified) {
      const { data: topQualified } = await admin
        .from('quiz_attempts')
        .select('id')
        .not('completed_at', 'is', null)
        .gte('correct_answers', 9)
        .order('score', { ascending: false })
        .order('correct_answers', { ascending: false })
        .order('completed_at', { ascending: true })
        .limit(1)
        .single()

      isWinner = topQualified?.id === attemptId
    }

    return NextResponse.json({
      score,
      correctAnswers,
      wrongAnswers,
      maxScore,
      totalQuestions: answers.length,
      totalParticipants: totalParticipants ?? 1,
      rank,
      qualified,
      isWinner,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
