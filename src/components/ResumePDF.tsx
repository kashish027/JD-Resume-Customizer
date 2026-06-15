import React from "react";
import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import { StructuredResume } from "@/lib/gemini";

export interface PDFSettings {
  fontFamily: "Helvetica" | "Times-Roman" | "Courier";
  fontSize: number;
  lineHeight: number;
  margin: number;
  sectionSpacing: number;
  themeColor: string;
}

export const DEFAULT_PDF_SETTINGS: PDFSettings = {
  fontFamily: "Helvetica",
  fontSize: 10,
  lineHeight: 1.35,
  margin: 35,
  sectionSpacing: 10,
  themeColor: "#1a252f",
};

interface ResumePDFProps {
  data: StructuredResume;
  settings?: PDFSettings;
}

/**
 * Parser helper to render text inline with clickable hyperlinks for Markdown [label](url) format
 */
const renderTextWithLinks = (text: string, fontSize: number) => {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [_, label, url] = match;
    const matchIndex = match.index;

    // Preceding plain text
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Interactive link element
    parts.push(
      <Link
        key={matchIndex}
        src={url}
        style={{
          color: "#2980b9",
          textDecoration: "underline",
        }}
      >
        {label}
      </Link>
    );

    lastIndex = regex.lastIndex;
  }

  if (parts.length === 0) {
    return <Text>{text}</Text>;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // Nesting elements inside <Text> forces inline word wrapping in React-PDF
  return (
    <Text>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          {typeof part === "string" ? <Text>{part}</Text> : part}
        </React.Fragment>
      ))}
    </Text>
  );
};

const getFontFamily = (font: string, bold = false) => {
  if (font === "Times-Roman") return bold ? "Times-Bold" : "Times-Roman";
  if (font === "Courier") return bold ? "Courier-Bold" : "Courier";
  return bold ? "Helvetica-Bold" : "Helvetica";
};

export const ResumePDF: React.FC<ResumePDFProps> = ({ data, settings = DEFAULT_PDF_SETTINGS }) => {
  const { personalInfo, summary, workExperience, education, projects, skills } = data;

  const styles = StyleSheet.create({
    page: {
      padding: settings.margin,
      fontSize: settings.fontSize,
      fontFamily: getFontFamily(settings.fontFamily),
      color: "#2c3e50",
      lineHeight: settings.lineHeight,
    },
    header: {
      borderBottomWidth: 1.5,
      borderBottomColor: settings.themeColor,
      paddingBottom: 8,
      marginBottom: settings.sectionSpacing,
    },
    name: {
      fontSize: settings.fontSize + 10,
      fontFamily: getFontFamily(settings.fontFamily, true),
      letterSpacing: 0.5,
      color: settings.themeColor,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 4,
      gap: 6,
      fontSize: settings.fontSize - 1.5,
      color: "#7f8c8d",
    },
    contactItem: {
      marginRight: 6,
    },
    contactLink: {
      color: "#2980b9",
      textDecoration: "underline",
    },
    section: {
      marginTop: settings.sectionSpacing,
    },
    sectionTitle: {
      fontSize: settings.fontSize + 1,
      fontFamily: getFontFamily(settings.fontFamily, true),
      color: settings.themeColor,
      borderBottomWidth: 1,
      borderBottomColor: "#bdc3c7",
      paddingBottom: 2,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    summary: {
      fontSize: settings.fontSize - 0.5,
      color: "#34495e",
      marginBottom: 4,
    },
    experienceItem: {
      marginBottom: 8,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      color: "#2c3e50",
      fontSize: settings.fontSize,
    },
    itemHeaderRole: {
      fontFamily: getFontFamily(settings.fontFamily, true),
    },
    itemHeaderDate: {
      fontFamily: getFontFamily(settings.fontFamily, true),
    },
    itemSubHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      color: "#7f8c8d",
      fontSize: settings.fontSize - 1,
      marginTop: 1,
      marginBottom: 3,
    },
    bulletList: {
      paddingLeft: 6,
    },
    bulletPoint: {
      flexDirection: "row",
      marginBottom: 2,
      fontSize: settings.fontSize - 0.5,
      color: "#34495e",
    },
    bullet: {
      width: 8,
      fontSize: settings.fontSize - 0.5,
    },
    bulletText: {
      flex: 1,
    },
    skillsContainer: {
      marginBottom: 3,
      fontSize: settings.fontSize - 1,
    },
    skillsCategory: {
      fontFamily: getFontFamily(settings.fontFamily, true),
      color: "#2c3e50",
    },
    skillsList: {
      color: "#34495e",
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.fullName || "Your Name"}</Text>
          <View style={styles.contactRow}>
            {personalInfo.email && (
              <Text style={styles.contactItem}>{personalInfo.email}</Text>
            )}
            {personalInfo.phone && (
              <Text style={styles.contactItem}>|  {personalInfo.phone}</Text>
            )}
            {personalInfo.location && (
              <Text style={styles.contactItem}>|  {personalInfo.location}</Text>
            )}
            {personalInfo.links && personalInfo.links.map((link, i) => (
              <Text key={i} style={styles.contactItem}>
                |  <Link src={link.url} style={styles.contactLink}>
                  {link.label}
                </Link>
              </Text>
            ))}
          </View>
        </View>

        {/* Summary Block */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        )}

        {/* Experience Block */}
        {workExperience && workExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {workExperience.map((exp, index) => (
              <View key={index} style={styles.experienceItem} wrap={false}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemHeaderRole}>{exp.role}</Text>
                  <Text style={styles.itemHeaderDate}>{exp.startDate} – {exp.endDate}</Text>
                </View>
                <View style={styles.itemSubHeader}>
                  <Text>{exp.company}</Text>
                  <Text>{exp.location}</Text>
                </View>
                <View style={styles.bulletList}>
                  {exp.description && exp.description.map((bullet, bulletIdx) => (
                    <View key={bulletIdx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>•</Text>
                      <View style={styles.bulletText}>
                        {renderTextWithLinks(bullet, settings.fontSize)}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Projects Block */}
        {projects && projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((proj, index) => (
              <View key={index} style={styles.experienceItem} wrap={false}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemHeaderRole}>
                    {proj.title} {proj.technologies && proj.technologies.length > 0 ? `(${proj.technologies.join(", ")})` : ""}
                  </Text>
                  {proj.link && (
                    <Link src={proj.link} style={styles.contactLink}>
                      Link
                    </Link>
                  )}
                </View>
                <View style={styles.bulletList}>
                  {proj.description && proj.description.map((bullet, bulletIdx) => (
                    <View key={bulletIdx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>•</Text>
                      <View style={styles.bulletText}>
                        {renderTextWithLinks(bullet, settings.fontSize)}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Education Block */}
        {education && education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu, index) => (
              <View key={index} style={{ marginBottom: 4 }} wrap={false}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemHeaderRole}>{edu.institution}</Text>
                  <Text style={styles.itemHeaderDate}>{edu.startDate} – {edu.endDate}</Text>
                </View>
                <View style={styles.itemSubHeader}>
                  <Text>{edu.degree}</Text>
                  <Text>{edu.location}</Text>
                </View>
                {edu.description && (
                  <Text style={{ fontSize: settings.fontSize - 1.5, color: "#555", marginLeft: 6 }}>{edu.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Skills Block */}
        {skills && skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            {skills.map((skillGroup, index) => (
              <Text key={index} style={styles.skillsContainer}>
                <Text style={styles.skillsCategory}>{skillGroup.category}: </Text>
                <Text style={styles.skillsList}>{skillGroup.items.join(", ")}</Text>
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};
