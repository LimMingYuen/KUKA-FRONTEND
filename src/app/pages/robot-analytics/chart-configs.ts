import { ChartConfiguration, ChartOptions } from 'chart.js';

/**
 * Renesas Brand Colors
 */
export const KUKA_COLORS = {
  primary: '#1976d2', // Renesas Blue
  secondary: '#2196f3', // Light Blue
  success: '#4caf50', // Green
  warning: '#ff9800', // Orange
  danger: '#f44336', // Red
  info: '#2196f3', // Light Blue
  gray: '#9e9e9e' // Gray
};

/**
 * Chart colors for different data series
 */
export const CHART_COLORS = {
  utilization: KUKA_COLORS.primary,
  working: KUKA_COLORS.success,
  charging: KUKA_COLORS.info,
  idle: KUKA_COLORS.gray,
  gridLines: 'rgba(0, 0, 0, 0.1)',
  tooltipBackground: 'rgba(0, 0, 0, 0.8)'
};

/**
 * Common chart options
 */
export const BASE_CHART_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        font: {
          family: 'Roboto, sans-serif',
          size: 12
        },
        padding: 15,
        usePointStyle: true
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: CHART_COLORS.tooltipBackground,
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        size: 13
      },
      padding: 12,
      cornerRadius: 4
    }
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: CHART_COLORS.gridLines
      },
      ticks: {
        font: {
          family: 'Roboto, sans-serif',
          size: 11
        },
        maxRotation: 45,
        minRotation: 0
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: CHART_COLORS.gridLines
      },
      ticks: {
        font: {
          family: 'Roboto, sans-serif',
          size: 11
        }
      }
    }
  }
} as any;

/**
 * Line chart configuration for Utilization Rate
 */
export function getUtilizationLineChartConfig(): any {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Utilization Rate (%)',
          data: [],
          borderColor: CHART_COLORS.utilization,
          backgroundColor: `${CHART_COLORS.utilization}33`, // 20% opacity
          borderWidth: 2,
          fill: true,
          tension: 0.4, // Smooth curve
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: CHART_COLORS.utilization,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      ...BASE_CHART_OPTIONS,
      plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        title: {
          display: true,
          text: 'Robot Utilization Rate Over Time',
          font: {
            size: 16,
            weight: 'bold',
            family: 'Roboto, sans-serif'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          ...BASE_CHART_OPTIONS.plugins?.tooltip,
          callbacks: {
            label: function(context: any) {
              const value = context.parsed?.y;
              if (value !== null && value !== undefined) {
                return `Utilization: ${value.toFixed(1)}%`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        ...BASE_CHART_OPTIONS.scales,
        y: {
          ...BASE_CHART_OPTIONS.scales?.['y'],
          max: 100,
          ticks: {
            ...BASE_CHART_OPTIONS.scales?.['y']?.ticks,
            callback: function(value: any) {
              return value + '%';
            }
          }
        }
      }
    }
  };
}

/**
 * Stacked area chart configuration for Time Distribution
 */
export function getTimeDistributionChartConfig(): any {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Working Time',
          data: [],
          borderColor: CHART_COLORS.working,
          backgroundColor: `${CHART_COLORS.working}99`, // 60% opacity
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: 'Charging Time',
          data: [],
          borderColor: CHART_COLORS.charging,
          backgroundColor: `${CHART_COLORS.charging}99`, // 60% opacity
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: 'Idle Time',
          data: [],
          borderColor: CHART_COLORS.idle,
          backgroundColor: `${CHART_COLORS.idle}99`, // 60% opacity
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      ...BASE_CHART_OPTIONS,
      plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        title: {
          display: true,
          text: 'Time Distribution (Working / Charging / Idle)',
          font: {
            size: 16,
            weight: 'bold',
            family: 'Roboto, sans-serif'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          ...BASE_CHART_OPTIONS.plugins?.tooltip,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context: any) {
              const value = context.parsed?.y;
              if (value !== null && value !== undefined) {
                const hours = Math.floor(value / 60);
                const minutes = Math.round(value % 60);
                return `${context.dataset.label}: ${hours}h ${minutes}m (${value.toFixed(0)} min)`;
              }
              return '';
            },
            footer: function(tooltipItems: any[]) {
              let sum = 0;
              tooltipItems.forEach(function(tooltipItem) {
                const value = tooltipItem.parsed?.y;
                if (value !== null && value !== undefined) {
                  sum += value;
                }
              });
              const totalHours = Math.floor(sum / 60);
              const totalMinutes = Math.round(sum % 60);
              return `Total: ${totalHours}h ${totalMinutes}m`;
            }
          }
        }
      },
      scales: {
        ...BASE_CHART_OPTIONS.scales,
        y: {
          ...BASE_CHART_OPTIONS.scales?.['y'],
          stacked: true,
          ticks: {
            ...BASE_CHART_OPTIONS.scales?.['y']?.ticks,
            callback: function(value: any) {
              const hours = Math.floor(Number(value) / 60);
              return hours + 'h';
            }
          }
        },
        x: {
          ...BASE_CHART_OPTIONS.scales?.['x'],
          stacked: true
        }
      },
      interaction: {
        mode: 'index' as const,
        intersect: false
      }
    }
  };
}

/**
 * Bar chart configuration for Utilization Comparison
 */
export function getUtilizationBarChartConfig(): any {
  return {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Utilization Rate (%)',
          data: [],
          backgroundColor: [],
          borderColor: CHART_COLORS.utilization,
          borderWidth: 1
        }
      ]
    },
    options: {
      ...BASE_CHART_OPTIONS,
      plugins: {
        ...BASE_CHART_OPTIONS.plugins,
        title: {
          display: true,
          text: 'Utilization Rate Comparison',
          font: {
            size: 16,
            weight: 'bold',
            family: 'Roboto, sans-serif'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          ...BASE_CHART_OPTIONS.plugins?.tooltip,
          callbacks: {
            label: function(context: any) {
              return `Utilization: ${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        ...BASE_CHART_OPTIONS.scales,
        y: {
          ...BASE_CHART_OPTIONS.scales?.['y'],
          max: 100,
          ticks: {
            ...BASE_CHART_OPTIONS.scales?.['y']?.ticks,
            callback: function(value: any) {
              return value + '%';
            }
          }
        }
      }
    }
  };
}

/**
 * Get color based on utilization level
 */
export function getUtilizationColorForChart(utilization: number): string {
  if (utilization >= 80) return KUKA_COLORS.success;
  if (utilization >= 60) return '#8bc34a'; // Light green
  if (utilization >= 40) return KUKA_COLORS.warning;
  if (utilization >= 20) return '#ff5722'; // Deep orange
  return KUKA_COLORS.danger;
}
