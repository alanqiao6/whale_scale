/* File: About.js
* Authors: August Hao
* Purpose: Provides the About page component displaying project background,
* scope, researcher information, and team member details.
*/
import React from 'react';
import './About.css';

const About = () => {
  const teamMembers = [
    {
      name: "Jason Fitzpatrick",
      year: "Class of 2025",
      major: "Electrical & Computer Engineering and Computer Science"
    },
    {
      name: "August Hao",
      year: "Class of 2027",
      major: "Electrical & Computer Engineering and Computer Science"
    },
    {
      name: "Alan Qiao",
      year: "Class of 2027",
      major: "Computer Science and Statistics"
    },
    {
      name: "Ciaran Burr",
      year: "Class of 2027",
      major: "Computer Science and Statistics"
    }
  ];

  return (
    <div className="about-container">
      <h1>About Whale Scale</h1>
      
      <section className="background-section">
        <h2>Background</h2>
        <p>
          The Duke Marine Robotics and Remote Sensing Laboratory (MaRRS Lab) conducts cutting-edge research on marine mammals, 
          particularly focusing on whale populations. Their work combines advanced robotics, remote sensing technologies, and 
          computer vision to study whale behavior, health, and population dynamics. This research is crucial for understanding 
          the impacts of climate change and human activities on marine ecosystems, and for developing effective conservation strategies.
        </p>
      </section>

      <section className="scope-section">
        <h2>Project Scope</h2>
        <p>
          Whale Scale is a web-based tool designed to assist marine biologists, researchers, students, teachers, and whale enthusiasts in measuring and analyzing whale dimensions from aerial photographs. 
          The platform provides a suite of measurement tools including length, width, and area calculations, enabling researchers to:
        </p>
        <ul className="scope-list">
          <li>Accurately measure whale dimensions from drone and aerial imagery</li>
          <li>Calculate body condition indices to assess whale health</li>
          <li>Track changes in whale size and population over time</li>
          <li>Export measurement data for further analysis</li>
        </ul>
        <p>
          By providing precise measurement capabilities and data analysis tools, Whale Scale helps researchers better understand whale health, 
          growth patterns, and the impacts of environmental changes on marine mammal populations.
        </p>
        <div className="scope-image">
          <img 
            src="https://cdn.discordapp.com/attachments/802244533102313475/1336128376393437264/ARG_20250201_6_1_A_250201_204357_398.jpeg?ex=6812bd84&is=68116c04&hm=9f73374dbfeca0f5de7b19ebe7628703736691b78f1c1805f1d3551cff052aa4&" 
            alt="Whale Research" 
          />
        </div>
      </section>

      <section className="client-section">
        <h2>Researchers</h2>
        <div className="client-info">
          <img 
            src="https://nicholas.duke.edu/sites/default/files/styles/square/public/images/image_3345362.jpg?h=199d8c1f&itok=4TIWY7DT" 
            alt="David Johnston" 
            className="client-image"
          />
          <h3>David Johnston</h3>
          <p>Duke Marine Robotics and Remote Sensing Laboratory (MaRRS Lab)</p>
          <p>Duke University</p>
        </div>
      </section>

      <section className="team-section">
        <h2>Development Team</h2>
        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <div key={index} className="team-member">
              <h3>{member.name}</h3>
              <p>{member.year}</p>
              <p>{member.major}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default About; 