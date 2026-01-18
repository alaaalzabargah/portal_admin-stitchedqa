/**
 * Finance Export Utilities
 * Handles Excel, CSV, and PDF generation for financial reports
 */

import * as XLSX from 'xlsx'
import { FinancialMetrics, TimeSeriesPoint } from './types'
import { formatCurrency } from '@/lib/utils'

/**
 * Clean data for CSV (remove commas, PII)
 */
function clean(val: any): string {
    if (val === null || val === undefined) return ''
    const str = String(val).replace(/,/g, '')
    return `"${str}"`
}

/**
 * Format minor currency to decimal
 */
function toDecimal(minor: number): number {
    return minor / 100
}

/**
 * Export comprehensive financial report to Excel
 */
export async function exportToExcel(
    periodLabel: string,
    metrics: FinancialMetrics,
    timeSeries: TimeSeriesPoint[],
    detailedOrders: any[]
) {
    // Create workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Executive Summary
    const summaryData = [
        ['Financial Report', periodLabel],
        ['Generated', new Date().toLocaleString()],
        [],
        ['EXECUTIVE SUMMARY'],
        ['Metric', 'Value'],
        ['Total Revenue (incl. Shipping)', formatCurrency(metrics.revenue)],
        ['Total Expenses', formatCurrency(metrics.expenses)],
        ['Net Profit', formatCurrency(metrics.netProfit)],
        ['Total Orders', metrics.orderCount.toString()],
        ['Average Order Value', formatCurrency(metrics.aov)],
        ['Profit Margin', metrics.revenue > 0 ? `${((metrics.netProfit / metrics.revenue) * 100).toFixed(1)}%` : '0%'],
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

    // Style summary sheet
    summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Sheet 2: Revenue Trend
    const trendData = [
        ['Period', 'Revenue (QAR)', 'Expenses (QAR)', 'Net Profit (QAR)', 'Margin %'],
        ...timeSeries.map(point => [
            point.period,
            toDecimal(point.revenue).toFixed(2),
            toDecimal(point.expenses).toFixed(2),
            toDecimal(point.netProfit).toFixed(2),
            point.revenue > 0 ? ((point.netProfit / point.revenue) * 100).toFixed(1) + '%' : '0.0%'
        ]),
        // Total row
        [
            'TOTAL',
            toDecimal(metrics.revenue).toFixed(2),
            toDecimal(metrics.expenses).toFixed(2),
            toDecimal(metrics.netProfit).toFixed(2),
            metrics.revenue > 0 ? ((metrics.netProfit / metrics.revenue) * 100).toFixed(1) + '%' : '0.0%'
        ]
    ]
    const trendWs = XLSX.utils.aoa_to_sheet(trendData)
    trendWs['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, trendWs, 'Revenue Trend')

    // Sheet 3: Detailed Orders
    const orderRows = [
        ['Order #', 'Date', 'Customer', 'Phone', 'Status', 'Source', 'Items', 'Subtotal (QAR)', 'Shipping (QAR)', 'Total (QAR)']
    ]

    for (const order of detailedOrders) {
        const customer = order.customer as any
        const itemCount = order.order_items?.length || 0

        orderRows.push([
            order.shopify_order_number || order.id,
            new Date(order.created_at).toLocaleDateString(),
            customer?.full_name || 'N/A',
            customer?.phone || 'N/A',
            order.status,
            order.source || 'walk_in',
            itemCount.toString(),
            toDecimal(order.total_amount_minor).toFixed(2),
            toDecimal(order.total_shipping_minor || 0).toFixed(2),
            toDecimal(order.total_amount_minor + (order.total_shipping_minor || 0)).toFixed(2)
        ])
    }

    const ordersWs = XLSX.utils.aoa_to_sheet(orderRows)
    ordersWs['!cols'] = [
        { wch: 12 }, // Order #
        { wch: 12 }, // Date
        { wch: 20 }, // Customer
        { wch: 15 }, // Phone
        { wch: 10 }, // Status
        { wch: 12 }, // Source
        { wch: 8 },  // Items
        { wch: 15 }, // Subtotal
        { wch: 15 }, // Shipping
        { wch: 15 }  // Total
    ]
    XLSX.utils.book_append_sheet(wb, ordersWs, 'Orders')

    // Sheet 4: Product Breakdown
    const productMap = new Map<string, { quantity: number; revenue: number }>()

    for (const order of detailedOrders) {
        for (const item of order.order_items || []) {
            const productName = `${item.product_name}${item.variant_title ? ` - ${item.variant_title}` : ''}`
            const existing = productMap.get(productName) || { quantity: 0, revenue: 0 }
            existing.quantity += item.quantity
            existing.revenue += item.quantity * item.unit_price_minor
            productMap.set(productName, existing)
        }
    }

    const productRows = [
        ['Product', 'Total Quantity', 'Total Revenue (QAR)']
    ]

    for (const [product, data] of Array.from(productMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue)) {
        productRows.push([
            product,
            data.quantity.toString(),
            toDecimal(data.revenue).toFixed(2)
        ])
    }

    const productsWs = XLSX.utils.aoa_to_sheet(productRows)
    productsWs['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, productsWs, 'Products')

    // Sheet 5: Customer List
    const customerMap = new Map<string, { orders: number; revenue: number; phone: string }>()

    for (const order of detailedOrders) {
        const customer = order.customer as any
        if (!customer) continue

        const customerName = customer.full_name || 'Unknown'
        const existing = customerMap.get(customerName) || { orders: 0, revenue: 0, phone: customer.phone || 'N/A' }
        existing.orders += 1
        existing.revenue += order.total_amount_minor + (order.total_shipping_minor || 0)
        customerMap.set(customerName, existing)
    }

    const customerRows = [
        ['Customer Name', 'Phone', 'Total Orders', 'Total Spent (QAR)']
    ]

    for (const [name, data] of Array.from(customerMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue)) {
        customerRows.push([
            name,
            data.phone,
            data.orders.toString(),
            toDecimal(data.revenue).toFixed(2)
        ])
    }

    const customersWs = XLSX.utils.aoa_to_sheet(customerRows)
    customersWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, customersWs, 'Customers')

    // Generate and download
    const fileName = `financial-report-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.xlsx`
    XLSX.writeFile(wb, fileName)
}

/**
 * Export professional PDF report with visual design
 */
export async function exportToPDF(
    periodLabel: string,
    metrics: FinancialMetrics,
    timeSeries: TimeSeriesPoint[],
    detailedOrders: any[]
) {
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPos = 20

    // Colors (as tuples)
    const primaryColor: [number, number, number] = [139, 92, 46]
    const accentColor: [number, number, number] = [34, 139, 34]
    const lightGray: [number, number, number] = [245, 245, 245]
    const darkGray: [number, number, number] = [100, 100, 100]

    // Header
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Financial Report', pageWidth / 2, 15, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(periodLabel, pageWidth / 2, 25, { align: 'center' })

    yPos = 45

    // Executive Summary Section
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Executive Summary', 14, yPos)
    yPos += 10

    // KPI Cards
    const cardWidth = (pageWidth - 40) / 3
    const cardHeight = 30
    const cardSpacing = 5

    // Card 1: Revenue
    doc.setFillColor(...lightGray)
    doc.roundedRect(14, yPos, cardWidth, cardHeight, 3, 3, 'F')
    doc.setFontSize(10)
    doc.setTextColor(...darkGray)
    doc.text('Total Revenue', 14 + cardWidth / 2, yPos + 8, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...accentColor)
    doc.text(formatCurrency(metrics.revenue), 14 + cardWidth / 2, yPos + 20, { align: 'center' })

    // Card 2: Orders
    doc.setFillColor(...lightGray)
    doc.roundedRect(14 + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...darkGray)
    doc.text('Total Orders', 14 + cardWidth * 1.5 + cardSpacing, yPos + 8, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text(metrics.orderCount.toString(), 14 + cardWidth * 1.5 + cardSpacing, yPos + 20, { align: 'center' })

    // Card 3: Profit
    doc.setFillColor(...lightGray)
    doc.roundedRect(14 + (cardWidth + cardSpacing) * 2, yPos, cardWidth, cardHeight, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...darkGray)
    doc.text('Net Profit', 14 + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPos + 8, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    const profitColor: [number, number, number] = metrics.netProfit >= 0 ? accentColor : [220, 53, 69]
    doc.setTextColor(...profitColor)
    doc.text(formatCurrency(metrics.netProfit), 14 + (cardWidth + cardSpacing) * 2 + cardWidth / 2, yPos + 20, { align: 'center' })

    yPos += cardHeight + 15

    // Additional metrics
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Average Order Value: ${formatCurrency(metrics.aov)}`, 14, yPos)
    doc.text(`Profit Margin: ${metrics.revenue > 0 ? ((metrics.netProfit / metrics.revenue) * 100).toFixed(1) : '0'}%`, pageWidth / 2 + 10, yPos)
    doc.text(`Total Expenses: ${formatCurrency(metrics.expenses)}`, 14, yPos + 6)

    yPos += 20

    // Orders Summary
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('Orders Overview', 14, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Processed ${detailedOrders.length} orders during this period.`, 14, yPos)
    yPos += 5

    const avgOrderValue = detailedOrders.length > 0
        ? detailedOrders.reduce((sum, o) => sum + o.total_amount_minor + (o.total_shipping_minor || 0), 0) / detailedOrders.length
        : 0
    doc.text(`Average transaction: ${formatCurrency(Math.round(avgOrderValue))}`, 14, yPos)
    yPos += 15

    // Top 5 Orders Table
    if (detailedOrders.length > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Top 5 Orders', 14, yPos)
        yPos += 5

        const topOrders = [...detailedOrders]
            .sort((a, b) => (b.total_amount_minor + (b.total_shipping_minor || 0)) - (a.total_amount_minor + (a.total_shipping_minor || 0)))
            .slice(0, 5)

        autoTable(doc, {
            startY: yPos,
            head: [['Order #', 'Customer', 'Total']],
            body: topOrders.map(order => [
                order.shopify_order_number || 'N/A',
                (order.customer as any)?.full_name || 'N/A',
                formatCurrency(order.total_amount_minor + (order.total_shipping_minor || 0))
            ]),
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            margin: { left: 14, right: 14 },
            styles: { fontSize: 9 }
        })

        yPos = (doc as any).lastAutoTable.finalY + 15
    }

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
        doc.addPage()
        yPos = 20
    }

    // Products Summary
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('Product Performance', 14, yPos)
    yPos += 8

    // Calculate product stats
    const productMap = new Map<string, { quantity: number; revenue: number }>()
    for (const order of detailedOrders) {
        for (const item of order.order_items || []) {
            const productName = `${item.product_name}${item.variant_title ? ` - ${item.variant_title}` : ''}`
            const existing = productMap.get(productName) || { quantity: 0, revenue: 0 }
            existing.quantity += item.quantity
            existing.revenue += item.quantity * item.unit_price_minor
            productMap.set(productName, existing)
        }
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`${productMap.size} unique products sold with ${Array.from(productMap.values()).reduce((sum, p) => sum + p.quantity, 0)} total items.`, 14, yPos)
    yPos += 10

    // Top 5 Products
    if (productMap.size > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Top 5 Products', 14, yPos)
        yPos += 5

        const topProducts = Array.from(productMap.entries())
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5)

        autoTable(doc, {
            startY: yPos,
            head: [['Product', 'Qty', 'Revenue']],
            body: topProducts.map(([name, data]) => [
                name,
                data.quantity.toString(),
                formatCurrency(data.revenue)
            ]),
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            margin: { left: 14, right: 14 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 30, halign: 'right' },
                2: { cellWidth: 40, halign: 'right' }
            }
        })

        yPos = (doc as any).lastAutoTable.finalY + 15
    }

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
        doc.addPage()
        yPos = 20
    }

    // Customer Insights
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('Customer Insights', 14, yPos)
    yPos += 8

    // Calculate customer stats
    const customerMap = new Map<string, { orders: number; revenue: number; phone: string }>()
    for (const order of detailedOrders) {
        const customer = order.customer as any
        if (!customer) continue

        const customerName = customer.full_name || 'Unknown'
        const existing = customerMap.get(customerName) || { orders: 0, revenue: 0, phone: customer.phone || 'N/A' }
        existing.orders += 1
        existing.revenue += order.total_amount_minor + (order.total_shipping_minor || 0)
        customerMap.set(customerName, existing)
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`${customerMap.size} unique customers served during this period.`, 14, yPos)
    yPos += 10

    // Top 5 Customers
    if (customerMap.size > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Top 5 Customers', 14, yPos)
        yPos += 5

        const topCustomers = Array.from(customerMap.entries())
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5)

        autoTable(doc, {
            startY: yPos,
            head: [['Customer', 'Orders', 'Total Spent']],
            body: topCustomers.map(([name, data]) => [
                name,
                data.orders.toString(),
                formatCurrency(data.revenue)
            ]),
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            margin: { left: 14, right: 14 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 90 },
                1: { cellWidth: 30, halign: 'right' },
                2: { cellWidth: 50, halign: 'right' }
            }
        })
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(...darkGray)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, pageHeight - 10)
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
    }

    // Download
    const fileName = `financial-report-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`
    doc.save(fileName)
}

/**
 * Export P&L Summary to CSV (Enhanced)
 */
export function exportToCSV(
    data: TimeSeriesPoint[],
    periodLabel: string,
    totals: FinancialMetrics
) {
    const headers = ['Period', 'Revenue (QAR)', 'Expenses (QAR)', 'Net Profit (QAR)', 'Margin %']

    const rows = data.map(point => [
        point.period,
        (point.revenue / 100).toFixed(2),
        (point.expenses / 100).toFixed(2),
        (point.netProfit / 100).toFixed(2),
        point.revenue > 0 ? ((point.netProfit / point.revenue) * 100).toFixed(1) + '%' : '0.0%'
    ])

    // Add Total Row
    rows.push([
        'TOTAL',
        (totals.revenue / 100).toFixed(2),
        (totals.expenses / 100).toFixed(2),
        (totals.netProfit / 100).toFixed(2),
        totals.revenue > 0 ? ((totals.netProfit / totals.revenue) * 100).toFixed(1) + '%' : '0.0%'
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(clean).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `financial-report-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
