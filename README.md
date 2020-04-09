# csp-vestec
This plugin for CosmoScout VR provides functionalities for urgent decision making using the VESTEC framework. The framework is developed under the VESTEC  - H2020 - EU project and is about emerging use modes for High Performance Computing (HPC). You can find more detailed information about VESTEC on the project website:  www.vestec-project.eu

![VESTEC - Portal UI to define and execute workflows on the HPC machines](docs/images/overview.png)

The plugin allows end-users registered to the VESTEC service system (see above image), to kick-off pre-defined workflows on an HPC machine and to analyze the result data in CosmoScout VR using the Node Editor shown in the next image. 

TODO: Describe how to receive data for the node editor

![VESTEC - Node editor for data analysis](docs/images/Editor.png)

The node editor currently has two kind of node types. The source nodes providing the result data to be analyzed and the render nodes, visualizing the output of the source nodes.

The following node types are implemented:
* Source Nodes:
    * **WildfireSourceNode**: Currently reads the Wildfire Analyst result data, which can be downloaded using the portal tab. The output provides different kind of geo-referenced textures whcih can be visualized using the **TextureRenderNode**
    * **CinemaDBNode**: Reads the persistence diagrams stored in a Cinema database. The cinema database can be downloaded using the portal tab. The output can be visualized using the **PersistenceRenderNode**
    * **DiseasesSensorInput**: Reads the sensor input data (geo-referenced textures) used by the diseases simulation code. Output can be visualized using the **TextureRenderNode**
    * **DiseasesSimulation**: Reads the simulation ensemble data from the diseases simulation. The output can be visualized using the **UncertaintyRenderNode**
* Render Nodes:
    * **PersistenceRenderNode**: Renders the persistence diagrams. User can specifiy minimum and maximum persistence values and directly brush data in the diagram. The output can be visualized using the **CriticalPointsNode**
    * **TextureRenderNode**: Simply renders the geo-referenced textures
    * **CriticalPointsNode**: Renders the critical points from the **PersistenceRenderNode**
    * **UncertaintyRenderNode**: Does uncertainty visualization using the output of the **DiseasesSimulation** node. Computes per pixel averages, variances, and differences using an OpenGL compute shader. This values are passed to a fragment shader and are used for color coding using a simple heat map. Users can select the visualization mode.   