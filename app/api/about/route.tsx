const content = `
## Hi there.

Think of Silenced as a personal archive of my mind—from life updates, late-night thoughts, random realizations, or just rants about whatever’s on my plate. It’s not for everyone, but if you’re here, maybe you’ll find something that resonates.

Read, scroll, lurk, or leave—it’s up to you.
`;

export async function GET() {
  return Response.json({
    content,
  });
}
