import { render, screen } from "@testing-library/react";
import ZenDashboard from "../ZenDashboard";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("ZenDashboard", () => {
  const defaultProps = {
    moodLevel: 2 as 1 | 2,
    streak: 5,
    onOverride: vi.fn(),
  };

  it("renders a compassionate message", () => {
    render(<ZenDashboard {...defaultProps} />);
    expect(screen.getByText(/journée off|mode passif|force pas/i)).toBeInTheDocument();
  });

  it("shows the current streak", () => {
    render(<ZenDashboard {...defaultProps} />);
    expect(screen.getByText(/5 jour/)).toBeInTheDocument();
  });

  it("shows override link", () => {
    render(<ZenDashboard {...defaultProps} />);
    expect(screen.getByText(/voir tout le dashboard/i)).toBeInTheDocument();
  });

  it("calls onOverride when link is clicked", () => {
    render(<ZenDashboard {...defaultProps} />);
    screen.getByText(/voir tout le dashboard/i).click();
    expect(defaultProps.onOverride).toHaveBeenCalledTimes(1);
  });
});
