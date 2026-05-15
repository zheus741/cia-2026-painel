import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute   = path.startsWith('/login') || path.startsWith('/auth')
  const isWaitingPage = path.startsWith('/aguardando-aprovacao')
  // Rotas que devem funcionar mesmo pra usuários não aprovados (logout/auth)
  const allowsUnaproved = isAuthRoute || isWaitingPage || path.startsWith('/api/auth')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Gate de aprovação: usuário logado mas profile.aprovado=false → bloqueia
  // tudo exceto a página de espera e o logout.
  if (user && !allowsUnaproved) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('aprovado')
      .eq('id', user.id)
      .maybeSingle()

    if (profile && profile.aprovado === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/aguardando-aprovacao'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
