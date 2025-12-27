# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e7]
        - heading "Ugent" [level=1] [ref=e9]
      - paragraph [ref=e10]: Welcome back! Sign in to continue
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Invalid login credentials
        - generic [ref=e14]:
          - generic [ref=e15]: Email
          - textbox "Email" [ref=e16]:
            - /placeholder: you@example.com
            - text: jbean@jovidoc.com
        - generic [ref=e17]:
          - generic [ref=e18]: Password
          - textbox "Password" [ref=e19]:
            - /placeholder: ••••••••
            - text: test123
        - button "Sign In" [ref=e20]
      - paragraph [ref=e22]:
        - text: Don't have an account?
        - link "Sign up" [ref=e23] [cursor=pointer]:
          - /url: /signup
    - link "← Back to home" [ref=e25] [cursor=pointer]:
      - /url: /
  - button "Open Next.js Dev Tools" [ref=e31] [cursor=pointer]:
    - img [ref=e32]
  - alert [ref=e35]
```