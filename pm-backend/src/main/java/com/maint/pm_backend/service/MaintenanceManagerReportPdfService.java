package com.maint.pm_backend.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.maint.pm_backend.dto.ReportResponse;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MaintenanceManagerReportPdfService {

    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(45, 50, 104));
    private static final Font SUBTITLE = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(80, 80, 90));
    private static final Font SECTION = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, new Color(17, 17, 17));
    private static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(40, 40, 45));
    private static final Font BODY_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);

    public byte[] render(ReportResponse report) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 34, 34);
            PdfWriter.getInstance(document, out);
            document.open();

            document.add(new Paragraph(report.getTitle(), TITLE));
            document.add(new Paragraph(report.getSubtitle(), SUBTITLE));
            document.add(new Paragraph("Period: " + report.getPeriodLabel() + "    Scope: " + report.getScopeLabel(), SUBTITLE));
            document.add(new Paragraph("Generated at: " + report.getGeneratedAt(), SUBTITLE));
            addSpacer(document, 10);

            addSummaryCards(document, report.getSummaryCards());

            for (ReportResponse.ReportSection section : report.getSections()) {
                addSpacer(document, 10);
                document.add(new Paragraph(section.getTitle(), SECTION));
                if (section.getDescription() != null && !section.getDescription().isBlank()) {
                    document.add(new Paragraph(section.getDescription(), BODY));
                }
                addSpacer(document, 6);
                if (!"table".equalsIgnoreCase(section.getVisualization())) {
                    Image chart = Image.getInstance(renderChart(section.getData()));
                    chart.scaleToFit(510, 170);
                    document.add(chart);
                    addSpacer(document, 6);
                }
                addDataTable(document, section.getData(), 8);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Unable to render PDF report: " + e.getMessage(), e);
        }
    }

    private void addSummaryCards(Document document, List<ReportResponse.SummaryCard> cards) throws Exception {
        if (cards == null || cards.isEmpty()) {
            return;
        }
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        for (ReportResponse.SummaryCard card : cards) {
            PdfPCell cell = new PdfPCell();
            cell.setPadding(9);
            cell.setBorderColor(new Color(235, 235, 245));
            cell.setBackgroundColor(new Color(247, 246, 252));
            cell.addElement(new Paragraph(card.getLabel(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(45, 50, 104))));
            cell.addElement(new Paragraph(formatValue(card.getValue(), card.getUnit()), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, toneColor(card.getTone()))));
            cell.addElement(new Paragraph(card.getDescription(), SUBTITLE));
            table.addCell(cell);
        }
        int remainder = cards.size() % 3;
        if (remainder > 0) {
            for (int i = remainder; i < 3; i++) {
                PdfPCell empty = new PdfPCell(new Phrase(""));
                empty.setBorder(Rectangle.NO_BORDER);
                table.addCell(empty);
            }
        }
        document.add(table);
    }

    private void addDataTable(Document document, List<Map<String, Object>> rows, int maxRows) throws Exception {
        if (rows == null || rows.isEmpty()) {
            document.add(new Paragraph("No data available for this section.", BODY));
            return;
        }
        List<String> columns = new ArrayList<>(rows.get(0).keySet());
        PdfPTable table = new PdfPTable(columns.size());
        table.setWidthPercentage(100);
        for (String column : columns) {
            PdfPCell header = new PdfPCell(new Phrase(toLabel(column), BODY_BOLD));
            header.setBackgroundColor(new Color(45, 50, 104));
            header.setPadding(5);
            table.addCell(header);
        }
        rows.stream().limit(maxRows).forEach(row -> {
            for (String column : columns) {
                PdfPCell cell = new PdfPCell(new Phrase(formatValue(row.get(column), ""), BODY));
                cell.setPadding(5);
                cell.setBorderColor(new Color(232, 232, 245));
                table.addCell(cell);
            }
        });
        document.add(table);
        if (rows.size() > maxRows) {
            document.add(new Paragraph("Showing first " + maxRows + " rows of " + rows.size() + " in the PDF preview table.", SUBTITLE));
        }
    }

    private byte[] renderChart(List<Map<String, Object>> rows) throws Exception {
        int width = 900;
        int height = 260;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);
        g.setColor(new Color(235, 235, 245));
        g.drawRoundRect(8, 8, width - 16, height - 16, 18, 18);

        if (rows == null || rows.isEmpty()) {
            g.setColor(new Color(98, 103, 129));
            g.drawString("No chart data available", 32, 132);
            g.dispose();
            return imageBytes(image);
        }

        List<ChartPoint> points = rows.stream().limit(10).map(this::chartPoint).toList();
        double max = points.stream().mapToDouble(ChartPoint::value).max().orElse(1);
        if (max <= 0) {
            max = 1;
        }
        int left = 50;
        int bottom = 210;
        int chartHeight = 150;
        int gap = 14;
        int barWidth = Math.max(24, (width - 110 - (points.size() * gap)) / Math.max(points.size(), 1));

        g.setColor(new Color(224, 224, 239));
        g.setStroke(new BasicStroke(2));
        g.drawLine(left, bottom, width - 42, bottom);
        g.drawLine(left, bottom - chartHeight, left, bottom);

        for (int i = 0; i < points.size(); i++) {
            ChartPoint point = points.get(i);
            int x = left + 20 + i * (barWidth + gap);
            int barHeight = (int) Math.round((point.value() / max) * chartHeight);
            g.setColor(new Color(45, 50, 104));
            g.fillRoundRect(x, bottom - barHeight, barWidth, barHeight, 8, 8);
            g.setColor(new Color(17, 17, 17));
            g.drawString(shortText(point.label(), 14), x, bottom + 20);
            g.setColor(new Color(98, 103, 129));
            g.drawString(formatNumber(point.value()), x, bottom - barHeight - 6);
        }

        g.dispose();
        return imageBytes(image);
    }

    private ChartPoint chartPoint(Map<String, Object> row) {
        String label = "Item";
        Double value = null;
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (label.equals("Item") && !(entry.getValue() instanceof Number)) {
                label = String.valueOf(entry.getValue());
            }
            if (value == null && entry.getValue() instanceof Number number) {
                value = number.doubleValue();
            }
        }
        return new ChartPoint(label, value == null ? 0 : value);
    }

    private byte[] imageBytes(BufferedImage image) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private void addSpacer(Document document, int points) throws Exception {
        Paragraph spacer = new Paragraph(" ");
        spacer.setSpacingAfter(points);
        document.add(spacer);
    }

    private Color toneColor(String tone) {
        if ("danger".equalsIgnoreCase(tone)) {
            return new Color(125, 0, 0);
        }
        if ("warning".equalsIgnoreCase(tone)) {
            return new Color(173, 83, 26);
        }
        if ("success".equalsIgnoreCase(tone)) {
            return new Color(46, 139, 87);
        }
        return new Color(45, 50, 104);
    }

    private String formatValue(Object value, String unit) {
        if (value == null) {
            return "N/A";
        }
        String suffix = unit == null || unit.isBlank() ? "" : " " + unit;
        if (value instanceof Number number) {
            return formatNumber(number.doubleValue()) + suffix;
        }
        return value + suffix;
    }

    private String formatNumber(double value) {
        if (Math.abs(value - Math.rint(value)) < 0.0001) {
            return String.valueOf((long) Math.rint(value));
        }
        return String.format("%.1f", value);
    }

    private String toLabel(String key) {
        return switch (key) {
            case "inProgress" -> "In Progress";
            case "underReview" -> "Under Review";
            case "activeFlags" -> "Active Flags";
            case "replacementRequired" -> "Replacement Required";
            case "completedReplacements" -> "Completed Replacements";
            case "flagsRaised" -> "Flags Raised";
            case "pmCompliance" -> "PM Compliance";
            case "employeeEfficiency" -> "Employee Efficiency";
            case "evidenceCompliance" -> "Evidence Compliance";
            case "approvalTurnaroundHours" -> "Approval Turnaround";
            case "rejectionRate" -> "Rejection Rate";
            case "lineName" -> "Line";
            case "machineName" -> "Machine";
            case "equipmentName" -> "Equipment";
            case "partName" -> "Part";
            case "taskName" -> "Task";
            case "taskRefNo" -> "Task Ref No";
            case "dueDate" -> "Due Date";
            case "raisedDate" -> "Raised Date";
            case "hasActiveFlag" -> "Has Active Flag";
            default -> key.replaceAll("([a-z])([A-Z])", "$1 $2").replace("_", " ");
        };
    }

    private String shortText(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max - 1) + ".";
    }

    private record ChartPoint(String label, double value) {
    }
}
