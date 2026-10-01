import {
  sendEmail,
  buildNewJobEmailTemplate,
  buildFollowNotificationEmail,
  buildHrInterestEmailTemplate,
} from '../services/emailService'

const TARGET_EMAIL = 'apkavin483@gmail.com'

async function triggerAllTemplates() {
  console.log('================================================================')
  console.log(`[Email Trigger] Dispatching All 3 Production Templates to: ${TARGET_EMAIL}`)
  console.log('================================================================\n')

  const results: { template: string; status: 'SUCCESS' | 'FAILED'; error?: string }[] = []

  // 1. Template: New Job Post Broadcast
  console.log('1. Triggering Template 1: [New Job Post Alert]...')
  try {
    const jobPayload = {
      id: 'job_sample_chennai_2026',
      title: 'Senior Full Stack Software Engineer (React / TypeScript)',
      company_name: 'Zoho Corporation',
      location: 'Chennai, Tamil Nadu',
      workplace_type: 'Hybrid',
      employment_type: 'Full-time',
      description:
        'Zoho is seeking an experienced Full Stack Engineer to lead front-end and cloud architecture for our enterprise communication suite. You will design scalable web components, optimize client bundle performance, and collaborate with product teams across Chennai and Tenkasi.',
      salary_range: '₹8,00,000 - ₹15,00,000 / year',
    }

    const html = buildNewJobEmailTemplate(jobPayload)
    await sendEmail({
      to: TARGET_EMAIL,
      subject: `New Job Opening in Chennai: ${jobPayload.title} at ${jobPayload.company_name} | Namma Ooru Jobs`,
      html,
    })
    console.log('   ✓ Template 1 Sent Successfully!')
    results.push({ template: 'New Job Post Alert', status: 'SUCCESS' })
  } catch (err: any) {
    console.error('   ✗ Template 1 Failed:', err.message)
    results.push({ template: 'New Job Post Alert', status: 'FAILED', error: err.message })
  }

  // 2. Template: New User Follow Notification
  console.log('\n2. Triggering Template 2: [New Connection / Follow Notification]...')
  try {
    const followPayload = {
      recipientEmail: TARGET_EMAIL,
      recipientName: 'Kavin',
      followerName: 'Priya Soundararajan',
      followerHeadline: 'Lead Front-End Architect & Tech Community Organizer',
      followerCompany: 'TVS Digital',
      followerAvatar: '',
      followerId: 'usr_priya_tvs_01',
    }

    const html = buildFollowNotificationEmail(followPayload)
    await sendEmail({
      to: TARGET_EMAIL,
      subject: `${followPayload.followerName} started following you on Namma Ooru Jobs`,
      html,
    })
    console.log('   ✓ Template 2 Sent Successfully!')
    results.push({ template: 'New Follower Notification', status: 'SUCCESS' })
  } catch (err: any) {
    console.error('   ✗ Template 2 Failed:', err.message)
    results.push({ template: 'New Follower Notification', status: 'FAILED', error: err.message })
  }

  // 3. Template: HR Recruiter Expresses Direct Interest in Employee
  console.log('\n3. Triggering Template 3: [HR Recruiter Direct Interest & Interview Invitation]...')
  try {
    const hrPayload = {
      candidateEmail: TARGET_EMAIL,
      candidateName: 'Kavin',
      hrName: 'Rajeshwaran K',
      hrCompany: 'Freshworks Technologies',
      hrPosition: 'Senior Talent Acquisition Lead',
      hrId: 'hr_freshworks_rajesh',
      customMessage:
        'Hello Kavin, We reviewed your impressive profile and background on Namma Ooru Jobs. Our team at Freshworks is currently expanding its core engineering group in Chennai and we would love to invite you for an introductory technical interview regarding this role.',
    }

    const html = buildHrInterestEmailTemplate(hrPayload)
    await sendEmail({
      to: TARGET_EMAIL,
      subject: `Priority Interview Invitation: ${hrPayload.hrCompany} expressed interest in your profile`,
      html,
    })
    console.log('   ✓ Template 3 Sent Successfully!')
    results.push({ template: 'HR Recruiter Direct Interest', status: 'SUCCESS' })
  } catch (err: any) {
    console.error('   ✗ Template 3 Failed:', err.message)
    results.push({ template: 'HR Recruiter Direct Interest', status: 'FAILED', error: err.message })
  }

  console.log('\n================================================================')
  console.log('TRIGGER SUMMARY:')
  console.table(results)
  console.log('================================================================')
}

triggerAllTemplates().catch(console.error)
