# FlowMate

FlowMate is an extension I've created to improve the efficiency, output, and overall happiness of myself, my team, and those I trust at work.

# Table of Contents

- [FlowMate](#flowmate)
- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Usage](#usage)
- [Widgets](#widgets)
  - [ASM Next Call Widget](#asm-next-call-widget)
    - [ASM Next Call Looping](#asm-next-call-looping)
      - [Loop countdown](#loop-countdown)
      - [Stopping the loop countdown](#stopping-the-loop-countdown)
- [Cleanup Widget](#cleanup-widget)
- [Analysis and Statistics](#analysis-and-statistics)
  - [Impact](#impact)

# Installation

To install, add the extension to your chrome browser at [the extension listing.](https://chromewebstore.google.com/detail/flowmate/momdffjhmchjbbhibejelfdakcdolbbm)

# Usage

Once installed, the extension will trigger on the SF and F9 windows.

It will automatically append two widgets to the page:

- ASM Next Call Widget
  - Inside of F9
- Cleanup Widget
  - Inside of SF

These widgets automate clicks and can be triggered by clicking the buttons and/or activating and deactivating loops.

Widgets will go near-invisible when the mouse is not on it, as shown below:

<img src="https://github.com/user-attachments/assets/b56b0f82-acef-4f5b-ac6a-d1d767755d32" width="270">

# Widgets

Below is an explanation of each widget.

## ASM Next Call Widget

This widget automates 4 clicks with 1 click of the "ASM Next Call" button. It will mark the call as "Answering Machine" in F9. The user can also automate this by using the loop functionality which requires zero clicks for a hands-off solution.

Below are images of the widget, along with an explanation of the loop functionality.

<img src="https://github.com/user-attachments/assets/0071ee00-57cc-4d57-9f11-a6dfa862ade1" width="540">

### ASM Next Call Looping

When "START LOOP" has been pressed, the loop will be active and the button will then say "STOP LOOP."

#### Loop countdown

When the loop is active, a countdown will be triggered when conditions are met. The countdown will do an initial high pitched beep, then medium pitched beeps every second until the timer ends (default 3 seconds). Once the timer ends, a low pitched beep will sound and the ASM Next Call button will be triggered.

These are the conditions that will trigger a countdown:

- Agent Call: Dialing has lasted longer than 35 seconds
- Agent Call: Live Call has connected

These conditions should not trigger a countdown:

- Agent Call: Wrap Up
- Inbound Call
  - All conditions

<span style="color:red">If anyone finds the coundown triggering when it shouldn't, let me know.</span>

#### Stopping the loop countdown

The loop countdown can be stopped in two ways:

1. Pressing the "STOP LOOP" button
2. Hovering back over the widget after originally hovering off of it

# Cleanup Widget

This widget keeps the tab count under 10 and removes the annoying toast notifications. It can remove them on a click or run a continous loop.

# Analysis and Statistics

ASM Next Call gives a 1-click solution to a 4-click problem, reducing fatigue of the users.

Under normal circumstances with 2 calls per minute users are required to click a _minimum_ of 3,840 times.

With this solution, users click a _maximum_ of 960 times, which can be even lower with the countdown loop.

That's 2,880 less clicks--_and that's the minimum._

This solution also reduces the wrap up time by a 1-4 seconds, allowing users to get to the next opportunity far more quickly than if they operated manually.

All of these statistics are assuming that the user is "focused," which is usually not the case. Meaning that, most likely, the impacts of this solution are far greater than what has been calculated. Although mental fatigue cannot be directly measured, it is undoubtably relieved with this solution and can enable the dialer to give more efforts towards the quality of their call and keeping personal and team morale high.

Oftentimes the user is distracted in countless ways including conversing with coworkers, scrolling, texting, reading, etc. This leads the user to not be clicking as often (which is understandable considering how often one has to click).

## Impact

Every user has thanked me for how much this solution has helped them with their job. They are grateful, happier, and more effective in performing their role.
