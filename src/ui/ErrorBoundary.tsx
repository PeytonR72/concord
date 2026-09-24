import { Component, type ReactNode } from 'react'
import { criticalBox, eyebrow, screenFrame, secondaryButton } from './classes'
import { StatusIcon } from './StatusIcon'

type Props = { children: ReactNode; onStartOver: () => void }

type State = { failed: boolean }

// Catches an error nothing else expected while a screen renders, so the page
// says so and offers a way back rather than going blank. React only catches
// render errors in a class component.
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  startOver = () => {
    this.props.onStartOver()
    this.setState({ failed: false })
  }

  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className={`${screenFrame} gap-6`}>
        <div className="flex flex-col gap-2">
          <p className={eyebrow}>Error</p>
          <h1 className="font-display text-title font-medium">Something went wrong</h1>
        </div>
        <div role="alert" className={`${criticalBox} max-w-prose`}>
          <StatusIcon tone="critical" />
          <p>
            Concord hit an error it didn&rsquo;t expect while showing this screen. Your file
            stayed in this tab: nothing was sent anywhere. Start over to try again.
          </p>
        </div>
        <div>
          <button type="button" className={secondaryButton} onClick={this.startOver}>
            Start over
          </button>
        </div>
      </main>
    )
  }
}
